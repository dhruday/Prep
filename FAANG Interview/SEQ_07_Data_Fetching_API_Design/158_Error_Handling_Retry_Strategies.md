# 158. Error Handling & Retry Strategies
**Phase:** State & Data | **Sequence:** 7 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds.

"Error handling in frontend is not just showing a message — it's a strategy. At SAP, I built a layered error handling system: every API call had typed error classification, retry logic for transient failures (network timeouts, 503s), and user-facing fallbacks for permanent failures (401, 404). I used exponential backoff with jitter for retries to avoid thundering herd on the backend. The result: we reduced user-visible errors by 60% and stopped overwhelming the server during brief outages."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists
Error handling is the system-level approach to detecting, classifying, and recovering from failures in API communication. Retry strategies determine when and how often to re-attempt failed requests.

Without proper error handling:
- Users see raw errors or blank screens
- Failed requests hammer the server during outages
- Transient errors (slow network) get treated the same as permanent errors (bad auth)

### How It Works Internally

**Error Classification — the most important step:**
```
HTTP Errors:
  4xx (Client errors) → Don't retry — user/app mistake
    400 Bad Request → Show validation error
    401 Unauthorized → Redirect to login
    403 Forbidden → Show access denied
    404 Not Found → Show empty state
  5xx (Server errors) → Retry is safe
    500 Internal Server Error → Maybe retry once
    503 Service Unavailable → Retry with backoff
  Network errors → Always safe to retry
    Timeout → Retry with longer timeout
    Connection refused → Retry with backoff
```

**Retry Strategies:**

1. **Simple Retry** — retry N times immediately. Bad idea under load.
2. **Fixed Delay** — wait same time between retries. Better, but still can cause waves.
3. **Exponential Backoff** — double the wait time each retry: 1s, 2s, 4s, 8s...
4. **Exponential Backoff + Jitter** — add random time to prevent synchronized retries from multiple clients:
   ```
   wait = min(cap, base * 2^attempt) + random(0, 1000ms)
   ```

### Architecture & Component Boundaries
```
UI Component
    ↓ calls
API Service Layer (axios/fetch wrapper)
    ↓ applies
Error Interceptor → classifies error type
    ↓ decides
Retry Engine → applies backoff
    ↓ either
Success → returns data to UI
Error → passes typed error to UI
    ↓
UI shows correct fallback (spinner / message / redirect)
```

### Data Flow & State Flow
```
Request sent
  → Success: update state with data
  → Network Error: enter retry loop
      → Retry 1 after 1s
      → Retry 2 after 2s
      → Retry 3 after 4s
      → Max retries hit: emit typed error
  → 4xx: skip retry, emit typed error immediately
  → User sees appropriate UI state
```

### Performance Implications
- Excessive retries increase latency for user
- Retry storms can take down a recovering server (thundering herd problem)
- Jitter solves thundering herd by spreading requests over time
- `AbortController` prevents stale retries when user navigates away

### Scalability Considerations
- **10K users:** Simple retry per request is fine
- **100K users:** Need jitter to prevent retry storms
- **10M users:** Need circuit breaker in addition — if 80% of requests fail, stop sending for 30s and let server recover

### Trade-offs
| Approach | Benefit | Risk | When to Choose |
|---|---|---|---|
| No retry | Simple | Bad UX on transient failures | Never for important APIs |
| Fixed delay retry | Easy to implement | Can cause retry waves | Low-traffic apps |
| Exponential backoff | Server-friendly | Longer wait for user | Standard choice |
| Backoff + jitter | Best server protection | Slightly more complex | High-traffic or critical APIs |
| Circuit breaker | Prevents server overload | Complex state machine | Microservices, high scale |

### ⚠️ Anti-Patterns & Pitfalls
- **Retrying 4xx errors** — 401/403/404 will never succeed — retrying wastes time and confuses users
- **No max retry limit** — without a cap, a failed API can retry forever and lock up the UI
- **No jitter** — all clients retry at the same intervals, causing waves that crush a recovering server
- **Swallowing errors silently** — logging `console.error` but showing no UI feedback leaves users confused
- **Same error handling for all errors** — network timeouts need retry; auth errors need redirect; not distinguishing between them gives poor UX

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, with 3 cross-functional teams all making API calls to OData services, I centralized error handling in an Axios interceptor. It auto-refreshed tokens on 401 (silent refresh pattern), retried 503s with exponential backoff + jitter, and emitted a `FatalError` event for unrecoverable failures. This reduced support tickets about blank screens by ~60%.

**At FAANG scale:**
- **Microsoft Teams**: Uses circuit breaker + retry for presence/chat APIs. If the presence service is degraded, it shows last-known presence instead of spinner-forever.
- **Adobe Creative Cloud**: File sync uses exponential backoff for upload retries with resumable upload support — partial failures don't restart from zero.
- **Salesforce**: Uses retry middleware in Lightning Web Components for Apex calls with configurable retry policy per endpoint criticality.
- **Cisco**: Network dashboards use aggressive retry for WebSocket reconnections but immediately fail on 403 (device not authorized).

**How it evolves with scale:**
- Small scale (< 10K users): Simple try/catch + 1 retry + user message
- Medium scale (100K users): Exponential backoff + jitter + typed error classification
- Large scale (10M+ users): Circuit breaker + retry budgets + degraded-mode UI + server-side rate limiting awareness

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "I classify errors first — 4xx errors I never retry because they're deterministic failures. For 5xx and network errors, I use exponential backoff with jitter. At SAP, I built a centralized interceptor that handled token refresh on 401, retried transient failures up to 3 times with 1s/2s/4s waits plus random jitter, and surfaced typed errors to the UI layer. The UI could then decide: show a retry button, redirect to login, or show an empty state. The key insight is that error handling is a product decision, not just a code decision — users need to know what happened and what they can do about it."

### Likely Follow-up Questions
1. "How do you prevent retry storms?" → Jitter — add random delay so clients don't all retry at the exact same time
2. "What is a circuit breaker?" → After N consecutive failures, stop sending requests for T seconds to let the server recover
3. "How do you handle token expiry during a request?" → Silent refresh — intercept 401, refresh token, replay original request transparently
4. "How do you show good UX during retries?" → Show skeleton or spinner with a subtle "Reconnecting..." message — never show raw error IDs

### vs Alternatives
| Approach | Alternative | Choose this when |
|---|---|---|
| Exponential backoff + jitter | Fixed interval retry | High traffic or shared services |
| Typed error classification | Generic catch-all | UX requires specific handling per error type |
| Centralized interceptor | Per-component try/catch | App has many API calls — avoid code duplication |

### How to Signal Senior Thinking
> "I always ask: is this error transient or permanent? That single question drives the entire retry and UX strategy. Transient = retry. Permanent = fail fast and guide the user."

---

## 💻 5. Code Example

```typescript
// Centralized retry fetch with exponential backoff + jitter
// Used in SAP-style API service layer

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  retryableStatuses: [500, 502, 503, 504],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBackoffDelay(attempt: number, baseDelayMs: number): number {
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // 0–1000ms random jitter
  return Math.min(exponential + jitter, 30_000); // cap at 30s
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  config: RetryConfig = DEFAULT_RETRY
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // 4xx = don't retry — deterministic client/auth error
      if (response.status >= 400 && response.status < 500) {
        throw new ApiError(response.status, await response.json());
      }

      // 5xx = retry if in retryable list
      if (config.retryableStatuses.includes(response.status)) {
        throw new TransientError(response.status);
      }

      return await response.json() as T;

    } catch (err) {
      if (err instanceof ApiError) throw err; // no retry on 4xx

      lastError = err as Error;

      if (attempt < config.maxRetries) {
        const delay = getBackoffDelay(attempt, config.baseDelayMs);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}

// Custom error classes for typed handling in UI
class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API Error ${status}`);
  }
}

class TransientError extends Error {
  constructor(public status: number) {
    super(`Transient Error ${status} — retrying`);
  }
}

// Usage in a React component or service
async function loadDashboardData() {
  try {
    return await fetchWithRetry<DashboardData>('/api/dashboard');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirectToLogin();
    } else {
      showErrorBanner('Failed to load dashboard. Please refresh.');
    }
  }
}
```

**Interview vs Production difference:**
In an interview, omit the custom error classes — just show the retry loop and backoff math. In production, add request cancellation via `AbortController`, saga/observable-based retry for RxJS apps, and structured error logging to Sentry.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** "Classify first, then decide — 4xx = fail fast, 5xx/network = retry with backoff + jitter"
**If you go blank:** "I'd start by classifying whether it's a client error or a server error — that determines everything else."
**Mnemonic:** **CRAB** — **C**lassify, **R**etry (transient only), **A**bort (4xx), **B**ackoff with jitter

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Users see meaningful errors and recovery options instead of blank screens
→ Performance: Jitter prevents retry storms from amplifying outages
→ Business: Lost requests = lost transactions — good retry logic saves revenue during brief outages

**How it works (3 sentences):**
Errors are classified into transient (network, 5xx) and permanent (4xx). Transient errors are retried using exponential backoff — delay doubles each attempt — with random jitter added to prevent multiple clients from retrying in lockstep. Permanent errors skip retry and surface a typed error to the UI layer, which shows the appropriate user action.

**Company relevance:**
- Microsoft: Tests reliability thinking — "how does your app behave during a partial outage?"
- Adobe: Asset upload flows must handle long retries gracefully with progress state preserved
- Salesforce: Apex call failures in LWC need structured retry so data isn't lost
- Cisco: Network APIs can go briefly unavailable — retry + circuit breaker protects dashboards

---
**✅ Topic 158/486 complete.**
**→ SEQ 07 now complete (Topics 149–164).**
