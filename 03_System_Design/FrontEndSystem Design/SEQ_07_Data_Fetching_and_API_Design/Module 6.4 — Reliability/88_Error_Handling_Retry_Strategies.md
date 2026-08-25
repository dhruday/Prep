# 88. Error Handling & Retry Strategies

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Error handling and retry strategies** form the reliability layer between your frontend and the unreliable network. Every API call can fail — network timeouts, server overload, transient DNS failures, or application-level errors. The difference between a senior and junior engineer's approach: juniors show error messages and stop; seniors classify errors (transient vs permanent), implement exponential backoff for transient failures, respect rate limit headers, and expose meaningful UX for each error category. At production scale, a frontend that aggressively retries on every failure during a server incident amplifies the problem — a 5-minute partial outage becomes 25 minutes as your retries add load. Error handling must be both user-friendly and operationally responsible.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Error Classification

```typescript
// First principle: not all errors should be retried

enum ErrorType {
  // TRANSIENT — Retry makes sense
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',      // Might succeed next time
  SERVER_UNAVAILABLE = 'SERVER_UNAVAILABLE', // 503 Service Unavailable
  RATE_LIMITED = 'RATE_LIMITED',            // 429 — retry after delay
  NETWORK_ERROR = 'NETWORK_ERROR',           // DNS failure, no connection
  
  // PERMANENT — Don't retry, show actionable message
  NOT_FOUND = 'NOT_FOUND',                  // 404 — resource doesn't exist
  FORBIDDEN = 'FORBIDDEN',                   // 403 — user lacks permissions
  UNAUTHORIZED = 'UNAUTHORIZED',             // 401 — session expired
  VALIDATION_ERROR = 'VALIDATION_ERROR',     // 400 — bad request from client
  CONFLICT = 'CONFLICT',                     // 409 — business rule conflict
  
  // UNKNOWN — Log and treat as permanent
  UNKNOWN = 'UNKNOWN',
}

function classifyError(error: unknown): ErrorType {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return ErrorType.NETWORK_ERROR;
  }
  
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400: return ErrorType.VALIDATION_ERROR;
      case 401: return ErrorType.UNAUTHORIZED;
      case 403: return ErrorType.FORBIDDEN;
      case 404: return ErrorType.NOT_FOUND;
      case 409: return ErrorType.CONFLICT;
      case 429: return ErrorType.RATE_LIMITED;
      case 503: return ErrorType.SERVER_UNAVAILABLE;
      default:
        if (error.status >= 500) return ErrorType.SERVER_UNAVAILABLE;
        return ErrorType.UNKNOWN;
    }
  }
  
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return ErrorType.NETWORK_TIMEOUT;
  }
  
  return ErrorType.UNKNOWN;
}

function shouldRetry(errorType: ErrorType): boolean {
  return [
    ErrorType.NETWORK_ERROR,
    ErrorType.NETWORK_TIMEOUT,
    ErrorType.SERVER_UNAVAILABLE,
    ErrorType.RATE_LIMITED,
  ].includes(errorType);
}
```

### Exponential Backoff with Jitter

```typescript
// Naive retry: all clients retry at same time → thundering herd
// Exponential backoff: space out retries logarithmically
// Jitter: randomize within range → de-sync client retry storms

function calculateBackoff(
  attemptNumber: number,
  options: {
    baseDelay?: number;      // Initial delay (ms)
    maxDelay?: number;       // Cap (ms)
    jitter?: boolean;        // Add randomness
  } = {}
): number {
  const {
    baseDelay = 1000,
    maxDelay = 30000,
    jitter = true,
  } = options;
  
  // Exponential: 1s, 2s, 4s, 8s, 16s, 30s (capped)
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, attemptNumber),
    maxDelay
  );
  
  if (!jitter) return exponentialDelay;
  
  // Full jitter: random value in [0, exponentialDelay]
  // Spreads retries across time window, prevents synchronized thundering herd
  return Math.random() * exponentialDelay;
}

// Attempt 0: 0-1000ms
// Attempt 1: 0-2000ms
// Attempt 2: 0-4000ms
// Attempt 3: 0-8000ms
// Attempt 4+: 0-30000ms
```

### React Query Retry Configuration

```typescript
// React Query has built-in retry with configurable backoff

// Global configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on client errors or auth errors
        if (error instanceof ApiError) {
          if (error.status >= 400 && error.status < 500) return false;
        }
        return failureCount < 3; // Max 3 retries for server errors
      },
      retryDelay: (attemptIndex) => 
        Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 0, // Don't retry mutations by default (side effects!)
    },
  },
});

// Query-level override
const { data, error, isError } = useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  retry: (failureCount, error) => {
    if (error instanceof ApiError && error.status === 404) return false;
    return failureCount < 2;
  },
  retryDelay: (attemptIndex, error) => {
    // Respect Retry-After header for 429 responses
    if (error instanceof ApiError && error.status === 429) {
      const retryAfter = error.headers?.get('Retry-After');
      if (retryAfter) return parseInt(retryAfter) * 1000;
    }
    return Math.min(1000 * 2 ** attemptIndex, 30000);
  },
});
```

### 429 Rate Limiting — Respecting Server

```typescript
// Critical: When server sends 429 with Retry-After, MUST use that value
// Ignoring it → requests keep hammering → account block or IP ban

class ApiClient {
  private retryAfterMap = new Map<string, number>(); // endpoint → timestamp
  
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const retryAfterTimestamp = this.retryAfterMap.get(endpoint);
    
    if (retryAfterTimestamp && Date.now() < retryAfterTimestamp) {
      const waitMs = retryAfterTimestamp - Date.now();
      throw new ApiError(429, 'RATE_LIMITED', `Rate limited. Retry in ${Math.ceil(waitMs / 1000)}s`);
    }
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delayMs = retryAfter 
        ? parseInt(retryAfter) * 1000 
        : 60000; // Default 1 minute if no header
      
      this.retryAfterMap.set(endpoint, Date.now() + delayMs);
      
      throw new ApiError(429, 'RATE_LIMITED', 
        `Rate limited. Will retry in ${Math.ceil(delayMs / 1000)} seconds`
      );
    }
    
    return response.json();
  }
}
```

### React Error Boundaries for UI Error Handling

```typescript
// Class component required for componentDidCatch
class QueryErrorBoundary extends Component<
  { children: ReactNode; fallback: (error: Error, reset: () => void) => ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to error tracking (Sentry, Datadog)
    reportError(error, { componentStack: info.componentStack });
  }
  
  reset = () => this.setState({ error: null });
  
  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}

// react-error-boundary library (recommended)
import { ErrorBoundary } from 'react-error-boundary';

function ProductList() {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div role="alert">
          <h2>Something went wrong</h2>
          <p>{error.message}</p>
          <button onClick={resetErrorBoundary}>Try Again</button>
        </div>
      )}
      onError={(error) => reportError(error)}
      onReset={() => queryClient.invalidateQueries(['products'])}
    >
      <ProductListInner />
    </ErrorBoundary>
  );
}
```

### Error UX Patterns — Per Error Type

```typescript
function ErrorMessage({ error }: { error: ApiError }) {
  const errorType = classifyError(error);
  
  switch (errorType) {
    case ErrorType.UNAUTHORIZED:
      return (
        <Alert type="warning">
          Your session has expired. 
          <Button onClick={() => router.push('/login')}>Sign In</Button>
        </Alert>
      );
    
    case ErrorType.FORBIDDEN:
      return (
        <Alert type="error">
          You don't have permission to view this content.
          <Link href="/support">Contact support</Link> if you believe this is a mistake.
        </Alert>
      );
    
    case ErrorType.NOT_FOUND:
      return (
        <EmptyState
          title="Not Found"
          description="This resource no longer exists."
          action={<Button onClick={() => router.back()}>Go Back</Button>}
        />
      );
    
    case ErrorType.NETWORK_ERROR:
      return (
        <Alert type="error">
          No internet connection. 
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </Alert>
      );
    
    case ErrorType.SERVER_UNAVAILABLE:
      return (
        <Alert type="warning">
          Service temporarily unavailable. Retrying automatically...
          {/* React Query will retry automatically with backoff */}
        </Alert>
      );
    
    case ErrorType.VALIDATION_ERROR:
      return (
        <Alert type="error">
          {error.message}
          {/* Show field-level errors from error.details */}
        </Alert>
      );
    
    default:
      return (
        <Alert type="error">
          Something went wrong. Please try again.
          <Button onClick={onRetry}>Retry</Button>
        </Alert>
      );
  }
}
```

### Offline Detection & Retry

```typescript
// Combine network status with automatic retry
function useOnlineRetry(refetch: () => void) {
  useEffect(() => {
    const handleOnline = () => {
      // Connection restored — retry failed queries
      refetch();
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetch]);
  
  return navigator.onLine;
}

// React Query handles this automatically with networkMode
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst', // Don't fail immediately when offline
      // Options: 'online' (default), 'always', 'offlineFirst'
    },
  },
});
```

### Anti-Patterns & Pitfalls

**1. Retrying mutations blindly:**
```typescript
// ❌ Retry a payment mutation → duplicate charges
const { mutate: pay } = useMutation({
  mutationFn: paymentApi.charge,
  retry: 3, // DANGEROUS for non-idempotent operations
});

// ✅ Only retry idempotent mutations; use idempotency keys
const { mutate: pay } = useMutation({
  mutationFn: (amount) => paymentApi.charge(amount, {
    idempotencyKey: generateIdempotencyKey(), // Server uses to deduplicate
  }),
  retry: 1, // Limited retry; server handles duplicate via idempotency key
});
```

**2. No ceiling on retry delay:**
```typescript
// ❌ Unbounded: attempt 20 → 2^20 seconds = 12 days!
retryDelay: (attemptIndex) => 1000 * Math.pow(2, attemptIndex);

// ✅ Always cap maximum delay
retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000);
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**AWS SDK Retry Strategy:**
- Exponential backoff with jitter built into every AWS SDK client
- They documented "jitte" (sic) as the critical addition that prevents thundering herd
- Full jitter vs equal jitter: see the AWS "Exponential Backoff and Jitter" blog post

**Stripe Idempotency Keys:**
- Every Stripe payment API requires an idempotency key
- Safe to retry payment requests with same key — server deduplicates
- Frontend generates UUID per payment attempt; stores for retry

**Bosch Real-Time Dashboard (Your Experience):**
- WebSocket disconnect → reconnect with exponential backoff (1s, 2s, 4s... up to 60s)
- On 503 from REST endpoints: auto-retry with jitter
- On network offline: queue mutations, flush on `online` event

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "My error handling strategy starts with classification. Not all errors should be retried — a 401 means the session expired, show a re-login prompt; a 404 means the resource is gone, show empty state; only transient errors like 503, network timeouts, or ECONNRESET benefit from retry.
>
> For retries I always use exponential backoff with jitter. The exponential part spaces retries logarithmically (1s, 2s, 4s). The jitter part randomizes within that window — this is critical because without jitter, all clients that failed simultaneously retry simultaneously, creating a thundering herd that can DoS your backend during recovery.
>
> For mutations specifically, I'm very conservative with retries. Non-idempotent operations like creating an order or charging a payment must not be retried naively — you could duplicate the action. Idempotency keys solve this: generate a UUID per mutation attempt, send it with the request, and the server deduplicates based on it. Stripe and most payment APIs require this.
>
> At SAP, our approval workflows had retry logic for transient API failures, but we used idempotency keys on approval POST requests to ensure that an accidental double-tap or retry didn't approve the same workflow twice."

**Likely Follow-up Questions:**
- "What is jitter and why does it matter?" → Random delay within backoff window; without it, all 10,000 clients retry at the same second → backend sees same spike it was already struggling with
- "How do you handle 401 mid-session?" → Intercept 401 in API client, trigger silent token refresh, replay original request; if refresh fails, redirect to login
- "How do you show retry progress to users?" → React Query exposes `failureCount` and `error` — show "Retrying... (attempt 2 of 3)"

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (see deep-dive above)

Complete classification, backoff, React Query integration, error boundary, and per-type UX patterns shown.

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**CRIB Framework:**
- **C**lassify → transient vs permanent → retry decision
- **R**etry with exponential backoff + **J**itter → prevent thundering herd
- **I**dempotency keys → safe mutation retry
- **B**oundary → ErrorBoundary catches render errors; React Query catches query errors

If you blank: *"Classify first: 4xx = don't retry (client error). 5xx + network = retry with exponential backoff + jitter. Never retry mutations without idempotency keys."*

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **UX**: Classified errors give actionable messages; auto-retry on transient errors = invisible recovery  
→ **Performance**: Jitter prevents retry storms that amplify server incidents  
→ **Business**: Duplicate charges from naive mutation retry → legal liability and customer trust damage

**How it works:**
→ API errors are caught and classified by HTTP status code. Transient errors trigger React Query's built-in retry with configurable exponential backoff + jitter delays. Permanent errors (4xx client errors) bypass retry and surface specific user-facing messages. Error boundaries catch render-phase errors. Mutation retries require idempotency keys to prevent duplicate side effects.

**Company relevance:**
→ **Microsoft**: Azure API client SDKs implement this exact pattern — know the pattern they'll reference  
→ **Adobe**: Creative Cloud sync operations retry with exponential backoff on 503  
→ **Salesforce**: Apex transaction limits mean 429s are common; frontend must handle gracefully  
→ **Cisco**: Network device configuration APIs can be slow → timeout + retry critical
