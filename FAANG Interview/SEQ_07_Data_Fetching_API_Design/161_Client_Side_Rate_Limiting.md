# 161. Client-Side Rate Limiting
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Client-side rate limiting proactively controls the rate at which a client sends API requests to avoid triggering server-side rate limits (429 responses), stay within API quota contracts, and prevent the client itself from overwhelming a server during bulk operations. It's distinct from the server-side enforcement — client-side rate limiting is a first line of self-governance. The two primary patterns are: token bucket (accumulate a budget of tokens at a fixed rate, spend one per request, hold if budget is empty) and leaky bucket / request queue with concurrency control (queue requests, process at most N at a time). In React applications, client-side rate limiting is most relevant for: bulk data imports, search-as-you-type at high frequency, analytics event batching, and third-party SDK integrations (Stripe, Twilio, analytics APIs) with strict per-second quotas.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Token Bucket Algorithm

```typescript
// Token bucket: a bucket that fills with tokens at a constant rate
// Each request consumes one token
// If the bucket is empty: queue the request until tokens refill

class TokenBucketRateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;    // tokens per millisecond
  private lastRefill: number;
  private readonly queue: Array<() => void> = [];
  private processingQueue = false;

  constructor({
    tokensPerSecond,
    maxTokens,
  }: {
    tokensPerSecond: number;
    maxTokens?: number;
  }) {
    this.maxTokens = maxTokens ?? tokensPerSecond;
    this.tokens = this.maxTokens;  // Start full
    this.refillRate = tokensPerSecond / 1000;  // per ms
    this.lastRefill = Date.now();
  }

  // Refill tokens based on elapsed time
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  // Acquire a token; waits async if none available
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;  // Token available immediately
    }

    // No tokens — queue this request
    return new Promise((resolve) => {
      this.queue.push(resolve);
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  private processQueue(): void {
    this.processingQueue = true;
    const intervalMs = 1000 / (this.refillRate * 1000);  // ms between tokens

    const tick = () => {
      this.refill();

      while (this.queue.length > 0 && this.tokens >= 1) {
        this.tokens -= 1;
        const resolve = this.queue.shift()!;
        resolve();
      }

      if (this.queue.length > 0) {
        setTimeout(tick, intervalMs);
      } else {
        this.processingQueue = false;
      }
    };

    setTimeout(tick, intervalMs);
  }

  get queueLength(): number {
    return this.queue.length;
  }
}

// Usage: rate-limited API client — max 10 requests per second
const rateLimiter = new TokenBucketRateLimiter({ tokensPerSecond: 10, maxTokens: 20 });

async function rateLimitedFetch<T>(url: string, init?: RequestInit): Promise<T> {
  await rateLimiter.acquire();  // Wait for token availability
  const response = await fetch(url, init);
  if (!response.ok) throw new ApiError(response.status, response.statusText);
  return response.json();
}
```

### Concurrency Limiter (Sliding Window)

```typescript
// Different problem: not rate per second, but max concurrent in-flight requests
// Use case: bulk import of 1000 items — don't fire all 1000 simultaneously

class ConcurrencyLimiter {
  private readonly maxConcurrent: number;
  private activeCount = 0;
  private readonly queue: Array<() => void> = [];

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.waitForSlot();

    this.activeCount++;
    try {
      return await task();
    } finally {
      this.activeCount--;
      this.releaseSlot();
    }
  }

  private waitForSlot(): Promise<void> {
    if (this.activeCount < this.maxConcurrent) {
      return Promise.resolve();  // Slot available immediately
    }
    return new Promise(resolve => this.queue.push(resolve));
  }

  private releaseSlot(): void {
    const next = this.queue.shift();
    if (next) next();
  }
}

// Example: bulk product sync — max 5 concurrent requests
const limiter = new ConcurrencyLimiter(5);

async function bulkSyncProducts(products: Product[]): Promise<void> {
  // All 1000 products queued; only 5 run at a time
  await Promise.all(
    products.map(product =>
      limiter.run(() => api.products.sync(product))
    )
  );
}

// With progress tracking:
async function bulkSyncWithProgress(
  products: Product[],
  onProgress: (completed: number, total: number) => void
): Promise<void> {
  let completed = 0;
  const total = products.length;
  const limiter = new ConcurrencyLimiter(5);

  await Promise.all(
    products.map(product =>
      limiter.run(async () => {
        await api.products.sync(product);
        completed++;
        onProgress(completed, total);  // Update progress UI
      })
    )
  );
}
```

### p-limit Library (Production Choice)

```typescript
// p-limit: npm's most downloaded concurrency limiter
// Simpler than hand-rolling the above

import pLimit from 'p-limit';

const limit = pLimit(5);  // Max 5 concurrent

async function importProducts(products: Product[]): Promise<void> {
  const tasks = products.map(product =>
    limit(() => api.products.create(product))
  );

  const results = await Promise.allSettled(tasks);

  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.error(`${failures.length} products failed to import`);
  }
}
```

### Analytics Event Batching (Rate Limiting Real Example)

```typescript
// Problem: every user interaction fires an analytics event
// 100 clicks/second × 1000 users = 100,000 analytics API calls/second
// Solution: batch events, send in bulk every 5 seconds or when batch reaches N events

class AnalyticsBatcher {
  private readonly queue: AnalyticsEvent[] = [];
  private readonly maxBatchSize: number;
  private readonly flushInterval: number;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor({ maxBatchSize = 50, flushIntervalMs = 5000 } = {}) {
    this.maxBatchSize = maxBatchSize;
    this.flushInterval = flushIntervalMs;
    this.scheduleFlush();
  }

  track(event: AnalyticsEvent): void {
    this.queue.push(event);
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();  // Flush immediately when batch is full
    }
  }

  private scheduleFlush(): void {
    this.timer = setTimeout(() => {
      this.flush();
      this.scheduleFlush();  // Reschedule after flush
    }, this.flushInterval);
  }

  private flush(): void {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.maxBatchSize);  // Take up to maxBatchSize events
    // Fire-and-forget: analytics failures shouldn't block user
    api.analytics.batchTrack(batch).catch(err => {
      console.error('Analytics flush failed', err);
      // Could implement retry or localStorage queue here for offline support
    });
  }

  // Call on app unload to prevent event loss
  flushSync(): void {
    if (this.queue.length === 0) return;
    // Use navigator.sendBeacon for reliable pre-unload delivery
    const batch = this.queue.splice(0);
    navigator.sendBeacon('/api/analytics', JSON.stringify(batch));
  }

  destroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.flushSync();
  }
}

// Global singleton
export const analytics = new AnalyticsBatcher({ maxBatchSize: 50, flushIntervalMs: 5000 });

// Usage:
analytics.track({ event: 'page_view', page: '/products/123' });
analytics.track({ event: 'add_to_cart', productId: '123' });

// Register cleanup on app unload:
window.addEventListener('beforeunload', () => analytics.destroy());
```

### Responding to 429 (Server-Enforced Rate Limiting)

```typescript
// When server returns 429, client should:
// 1. Read Retry-After header
// 2. Queue pending requests
// 3. Resume after the delay

class RateLimitAwareClient {
  private rateLimitedUntil: number | null = null;
  private readonly pendingRequests: Array<() => void> = [];

  async fetch<T>(url: string, init?: RequestInit): Promise<T> {
    // If we're in a rate-limited period, queue this request
    if (this.rateLimitedUntil !== null) {
      const waitMs = this.rateLimitedUntil - Date.now();
      if (waitMs > 0) {
        await new Promise<void>(resolve => {
          setTimeout(resolve, waitMs);
        });
      }
      this.rateLimitedUntil = null;
    }

    const response = await fetch(url, init);

    if (response.status === 429) {
      // Parse Retry-After header (seconds or HTTP date)
      const retryAfter = response.headers.get('Retry-After');
      const delayMs = retryAfter
        ? (isNaN(Number(retryAfter))
            ? new Date(retryAfter).getTime() - Date.now()
            : parseInt(retryAfter) * 1000)
        : 60_000;  // Default: 1 minute

      this.rateLimitedUntil = Date.now() + delayMs;
      throw new RateLimitedError(delayMs);
    }

    if (!response.ok) throw new ApiError(response.status, response.statusText);
    return response.json();
  }
}

// TanStack Query integration — use retryDelay to respect Retry-After:
useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  retry: (failureCount, error) => {
    if (error instanceof RateLimitedError) return failureCount < 3;
    return false;
  },
  retryDelay: (attempt, error) => {
    if (error instanceof RateLimitedError) return error.retryAfterMs;
    return Math.min(1000 * 2 ** attempt, 30_000);
  },
});
```

### ⚠️ Anti-Patterns

- **No visibility during rate limiting** — requests queue silently; user sees nothing; a "5 requests remaining in batch" or "Throttled — sending requests..." indicator prevents confusion when bulk operations are slower than expected

- **Unbounded queue growth** — a queue with no maximum length will grow indefinitely if the rate limiter can't keep up; set a queue maximum and reject excess requests with a clear error, rather than silently queuing thousands of requests that will take hours to process

- **Rate limiting queries but not mutations** — mutations that trigger in rapid succession (form auto-save on keystroke) also benefit from debouncing/rate limiting; forgetting mutations creates the same problem as forgetting queries

- **Client rate limiting instead of backend enforcement** — client-side rate limiting is a courtesy and protection mechanism, not a security control; a malicious actor can bypass client-side rate limiting; always enforce rate limits on the server and use client-side limiting to improve user experience and avoid accidental quota exhaustion

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, a procurement bulk import feature allowed users to upload Excel files with 10,000 supplier records. The naive implementation submitted all 10,000 as parallel API calls, causing 503 responses from the SAP backend (connection pool exhaustion) and 15-minute processing times due to retries. Added `p-limit(10)` — 10 concurrent requests maximum — with a progress bar. Processing time dropped from 15 minutes (with retries and errors) to 3 minutes (steady throughput), and 0 connection pool errors.

**At FAANG scale:**
- **Microsoft:** Microsoft Graph bulk API — SDK includes automatic throttling; when a 429 is received, the Graph SDK enters "throttle mode" and queues all pending requests; a `ThrottlingInfo` event fires with retry delay; applications subscribe to this event to show "Throttled — resuming in {n}s" in the UI
- **Adobe:** Experience Cloud data collection — client-side event batching collects up to 100 events per 5-second window; `navigator.sendBeacon` used for pre-unload delivery; batching reduced analytics API calls by 96% (100× fewer HTTP requests) while maintaining equivalent data fidelity
- **Salesforce:** Salesforce Bulk API v2 — client SDK enforces 1 concurrent bulk job per org at a time (server limit); subsequent job submissions queue locally; Salesforce Data Loader UI shows queue position ("Job 3 of 5 — waiting...")
- **Cisco:** NETCONF bulk device configuration — Cisco NSO SDK limits to 5 concurrent device pushes by default (configurable per deployment); exceeding this risks device CPU spikes causing dropped connections; the limiter protects both the devices and the provisioning pipeline

---

## 💬 4. Interview Execution

### Sample Answer

> "Client-side rate limiting is about proactive self-governance — not waiting for a 429 to tell you to slow down, but controlling your own request rate to stay within quotas.
>
> The token bucket algorithm is the cleanest implementation: the bucket fills at a constant rate (e.g., 10 tokens per second), each request consumes one token, and if the bucket is empty the request waits. Unlike debouncing (which delays until idle) or throttling (which drops excess calls), token bucket queues all requests and processes them at a controlled rate — no data loss.
>
> For bulk operations (batching 1,000 records), I use concurrency limiting over per-second rate limiting: max N requests in-flight simultaneously. `p-limit` is the production library for this; it's a 200-byte implementation of the concurrency limiter pattern.
>
> For analytics specifically, batching is the best approach: collect events in a queue, flush every 5 seconds or when the batch reaches 50 events, and use `navigator.sendBeacon` for reliable pre-unload delivery.
>
> When the server sends a 429, I parse the `Retry-After` header and wait exactly that duration before resuming. I show the user a 'Throttled — resuming in Xs' message rather than a silent wait."

### Likely Follow-up Questions
1. "What's the difference between token bucket and leaky bucket?" → Token bucket: requests can burst up to `maxTokens` simultaneously (if tokens have accumulated), then throttles; leaky bucket: requests always exit at a constant rate with no burst allowance. Token bucket is more appropriate for interactive UIs that have idle periods (tokens accumulate) followed by burst activity; leaky bucket for strictly uniform rate requirements like telemetry streams
2. "How do you handle a request queue that fills up?" → Set a maximum queue size; when the queue is full, either reject new requests immediately with a clear error ("Request limit reached, please slow down") or implement a priority queue that drops lower-priority requests first; never silently accept unbounded queues as they consume memory and create arbitrary latency for users waiting at the back of a thousands-item queue
3. "Should the rate limiter be global or per-user?" → For a single-user app (webapps with per-browser sessions), a global rate limiter is sufficient. For a server-side application or API gateway serving multiple users, rate limiting must be per-user or per-API-key to prevent one user's bulk operation from consuming another user's quota. At the client/browser level, all requests are naturally from one user, so a global client-side rate limiter is correct

---

## 💻 5. Code Example (TypeScript)

```typescript
// React hook wrapping a concurrency limiter with progress tracking

import pLimit from 'p-limit';
import { useState, useCallback } from 'react';

interface BulkOperationState {
  total: number;
  completed: number;
  failed: number;
  isRunning: boolean;
}

function useBulkOperation<T, R>(
  operation: (item: T) => Promise<R>,
  concurrency = 5
) {
  const [state, setState] = useState<BulkOperationState>({
    total: 0,
    completed: 0,
    failed: 0,
    isRunning: false,
  });

  const run = useCallback(async (items: T[]): Promise<PromiseSettledResult<R>[]> => {
    const limit = pLimit(concurrency);

    setState({ total: items.length, completed: 0, failed: 0, isRunning: true });

    const tasks = items.map(item =>
      limit(async () => {
        try {
          const result = await operation(item);
          setState(s => ({ ...s, completed: s.completed + 1 }));
          return result;
        } catch (err) {
          setState(s => ({ ...s, failed: s.failed + 1, completed: s.completed + 1 }));
          throw err;
        }
      })
    );

    const results = await Promise.allSettled(tasks);
    setState(s => ({ ...s, isRunning: false }));
    return results;
  }, [operation, concurrency]);

  const progress = state.total > 0 ? Math.round((state.completed / state.total) * 100) : 0;

  return { run, ...state, progress };
}

// Usage: bulk product sync with progress UI
function BulkSyncPanel({ products }: { products: Product[] }) {
  const { run, isRunning, progress, completed, failed, total } =
    useBulkOperation((product: Product) => api.products.sync(product), 5);

  const handleSync = async () => {
    const results = await run(products);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    toast.success(`Synced ${successCount}/${total} products`);
  };

  return (
    <div>
      <button onClick={handleSync} disabled={isRunning}>
        {isRunning ? `Syncing ${completed}/${total}…` : 'Sync All Products'}
      </button>
      {isRunning && (
        <div>
          <progress value={progress} max={100} aria-label={`${progress}% complete`} />
          <span>{progress}% ({failed > 0 ? `${failed} failed` : 'all successful so far'})</span>
        </div>
      )}
    </div>
  );
}
```

---

## 🧠 6. Memory Aid

**TBC — rate limiting strategies:**
- **T**oken bucket: burst-tolerant, fill-and-spend model
- **B**atch: collect events, flush periodically (analytics)
- **C**oncurrency limit: N in-flight max (bulk operations)

**"The supermarket checkout analogy":**
Token bucket = each item requires a checkout token; tokens accumulate at a constant rate; you can batch multiple items if tokens are available (burst), then must wait for re-fill.
Concurrency limiter = there are N checkout lanes; each item uses one lane; when all lanes are busy, items queue at the entrance until a lane frees up.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Client-side rate limiting for bulk operations prevents the "thundering herd" problem when users initiate large data operations — an import of 10,000 records without limiting fires 10,000 simultaneous HTTP requests, all competing for a fixed connection pool, causing 503 errors, exponential backoff retries, and actual throughput far lower than a rate-limited batch that steadily processes 10 concurrent requests
→ Analytics batching is a 100× efficiency multiplier — 100 events batched into 1 POST request reduces server-side processing, authentication overhead, and network round trips by 99% without any data loss; using `navigator.sendBeacon` for the final flush prevents event loss when the tab closes
→ Client-side rate limiting is a protection mechanism, not a security control — it protects the client from accidentally violating quotas and provides better UX during throttled periods; it must coexist with server-side enforcement which remains the authoritative rate limit

**How it works (2 sentences):**
The token bucket algorithm maintains a counter (`tokens`) that increases at a fixed `refillRate` (tokens per millisecond) up to `maxTokens`; on each request, `acquire()` atomically decrements the counter by 1 and proceeds immediately if enough tokens exist, or queues the request in a Promise array; a drain loop processes the queue each time new tokens are available, calling the queued resolve functions in order.
The concurrency limiter maintains an `activeCount` counter and a `queue` of pending resolve functions; `run(task)` increments `activeCount` and executes `task` if `activeCount < maxConcurrent`, otherwise queues a resolve function; when any active task finishes (in the `finally` block), `activeCount` is decremented and the next queued resolve is called, allowing one more task to proceed.

---
✅ Topic 161/486 complete → Continuing to Topic 162: Circuit Breaker Pattern
