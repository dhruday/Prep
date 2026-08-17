# 92. Circuit Breaker Pattern

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

The **Circuit Breaker pattern** is a fault-tolerance mechanism borrowed from electrical engineering and popularized by Michael Nygard's *Release It!*. In frontend systems it prevents cascading failures: when a downstream API is degraded, the circuit "opens" and all subsequent calls fail immediately without hitting the network — protecting the server from thundering herd retries, and protecting the user from infinite loading states. After a configurable timeout the circuit enters "half-open" state, probing with a single request to test recovery. This is the difference between a frontend that gracefully degrades during incidents and one that turns every user into an inadvertent DDoS attacker.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Three States of a Circuit Breaker

```
CLOSED ──(failure threshold exceeded)──→ OPEN
  ↑                                         |
  └──(probe succeeds)──── HALF-OPEN ←──(timeout expires)
```

- **CLOSED**: Normal operation. Requests flow through. Failures are counted.
- **OPEN**: All requests fail immediately (fast fail). No network calls made.
- **HALF-OPEN**: One probe request allowed. If it succeeds → CLOSED. If it fails → back to OPEN.

### Full TypeScript Implementation

```typescript
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;      // Failures before OPEN (e.g., 5)
  successThreshold: number;      // Successes in HALF_OPEN before CLOSE (e.g., 2)
  timeout: number;               // ms in OPEN before HALF_OPEN probe (e.g., 30_000)
  volumeThreshold: number;       // Min requests before evaluating failure rate
  errorRateThreshold: number;    // % failures to trigger OPEN (e.g., 0.5 = 50%)
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private totalRequests = 0;
  private lastFailureTime = 0;
  private openedAt = 0;
  
  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {}
  
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed < this.config.timeout) {
        // Fast fail — don't attempt network call
        throw new CircuitOpenError(
          `Circuit ${this.name} is OPEN. Retry after ${
            Math.ceil((this.config.timeout - elapsed) / 1000)
          }s`,
          Math.ceil((this.config.timeout - elapsed) / 1000)
        );
      }
      // Timeout expired — try half-open probe
      this.transition('HALF_OPEN');
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
  
  private onSuccess(): void {
    this.totalRequests++;
    
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.reset();
        this.transition('CLOSED');
      }
      return;
    }
    
    // In CLOSED: reset failure count on success
    this.failures = 0;
  }
  
  private onFailure(): void {
    this.failures++;
    this.totalRequests++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      // Probe failed — back to OPEN
      this.openedAt = Date.now();
      this.transition('OPEN');
      return;
    }
    
    // Check if we should open the circuit
    if (
      this.totalRequests >= this.config.volumeThreshold &&
      this.failures / this.totalRequests >= this.config.errorRateThreshold
    ) {
      this.openedAt = Date.now();
      this.transition('OPEN');
    } else if (this.failures >= this.config.failureThreshold) {
      this.openedAt = Date.now();
      this.transition('OPEN');
    }
  }
  
  private transition(to: CircuitState): void {
    const from = this.state;
    this.state = to;
    this.config.onStateChange?.(from, to);
  }
  
  private reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;
  }
  
  getState(): CircuitState { return this.state; }
  
  getMetrics() {
    return {
      state: this.state,
      failures: this.failures,
      totalRequests: this.totalRequests,
      errorRate: this.totalRequests > 0
        ? (this.failures / this.totalRequests * 100).toFixed(1) + '%'
        : '0%',
      openedAt: this.openedAt ? new Date(this.openedAt).toISOString() : null,
    };
  }
}

class CircuitOpenError extends Error {
  constructor(message: string, public readonly retryAfterSeconds: number) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}
```

### Registry Pattern — Per-Service Breakers

```typescript
// Singleton registry — one breaker per logical service
class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers = new Map<string, CircuitBreaker>();
  
  static getInstance() {
    if (!this.instance) this.instance = new CircuitBreakerRegistry();
    return this.instance;
  }
  
  getOrCreate(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }
  
  getAllMetrics() {
    return Object.fromEntries(
      Array.from(this.breakers.entries()).map(([name, cb]) => [name, cb.getMetrics()])
    );
  }
}

// Usage in API layer
const registry = CircuitBreakerRegistry.getInstance();

async function fetchUserProfile(userId: string) {
  const cb = registry.getOrCreate('user-service', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30_000,
    volumeThreshold: 10,
    errorRateThreshold: 0.5,
    onStateChange: (from, to) => {
      analytics.track('circuit_breaker_state_change', { service: 'user-service', from, to });
      if (to === 'OPEN') {
        toast.warning('User service is experiencing issues. Some features may be unavailable.');
      }
    },
  });
  
  return cb.call(() => apiClient.get(`/users/${userId}`));
}
```

### UX Strategy When Circuit is Open

```typescript
// Graceful degradation strategy — don't just show an error
async function getUserData(userId: string) {
  try {
    return await fetchUserProfile(userId);
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      return {
        // Return cached data if available
        ...getCachedProfile(userId),
        _stale: true,
        _retryAfter: err.retryAfterSeconds,
      };
    }
    throw err;
  }
}
```

### Performance Implications

- **Fast fail latency**: <1ms (no network hop) vs 30s timeout on a dead endpoint
- **Memory**: one breaker object per service — negligible
- **State persistence**: for multi-tab scenarios, use BroadcastChannel to sync circuit state across tabs (one tab opening the circuit should warn all tabs)

### Anti-Patterns

- **One global breaker**: partial service degradation should not close the entire API — use per-service breakers
- **Opening on 4xx errors**: 401/403/404 are NOT network failures — they're correct responses. Only open on 5xx, timeouts, and network errors
- **No observability**: circuit state changes must be logged to monitoring (Datadog, Sentry) — silent opens are invisible production issues

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Netflix (classic case):** The recommendations service circuit breaker saved the main page during the 2012 AWS outage — users got a page without recommendations rather than a blank page.

**Microsoft Teams:** The notification service has a circuit breaker; when it's open, Teams stops showing real-time counts but still works for messaging — degraded, not broken.

**SAP Fiori (your experience):** A micro-frontend architecture where each MFE has its own breaker for its backend. If one SAP backend module fails, only that domain UI degrades — rest of the shell works.

**Scaling:**
- 1,000 users: circuit breaker is a nice-to-have resilience layer
- 100,000 users: a flaky API without a breaker causes 100,000 concurrent 30s hangs
- 10M users: a 30s timeout on a dead service = 300M seconds of wasted thread time — the circuit breaker is existential

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "The circuit breaker pattern is my first defence against cascading failures in frontend architectures. The core insight is that retrying a dead service makes things worse — every retry adds load and delays the user. So I implement a three-state machine: CLOSED for normal operation, OPEN when failure rate exceeds a threshold, and HALF-OPEN for controlled recovery probes. I keep separate breakers per logical service — user service, content service, analytics — so a partial outage doesn't take down the whole app. When the circuit opens, I return cached data where available and show a clear but non-alarming degraded state UI. I also sync circuit state across browser tabs via BroadcastChannel, so one tab discovering the outage protects all tabs. The metrics — error rate, state transitions — feed into Datadog so the incident response team sees the frontend perspective of the outage."

**Likely Follow-up Questions:**
1. *How do you differentiate circuit-worthy failures from normal errors?* → Only `5xx`, timeouts, and `TypeError: Failed to fetch` — never 4xx
2. *Should circuit breaker state persist across page reloads?* → Optional: SessionStorage for 30-minute windows; usually not worth the complexity
3. *How does this compose with React Query's retry logic?* → Set React Query `retry: 0` for circuit-protected calls; the breaker handles the retry policy
4. *What's the difference between circuit breaker and bulkhead pattern?* → Circuit = stop all traffic on failure; Bulkhead = limit concurrent calls to prevent resource exhaustion
5. *How do you test circuit breaker logic?* → Unit test state transitions; integration test by mocking fetch to return 500s repeatedly

**Comparison With Alternatives:**

| Pattern | Opens on failure? | Queues requests? | Complexity | Best For |
|---|---|---|---|---|
| Retry with backoff | No | No | Low | Transient errors |
| Circuit Breaker | Yes | No (fast fail) | Medium | Service outages |
| Bulkhead | No | Yes (limits concurrency) | Medium | Resource protection |
| Fallback only | N/A | No | Low | Simple degradation |

---

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (BroadcastChannel Sync)
────────────────────────────────────────────────────────────

```typescript
// Multi-tab circuit state synchronization
class SyncedCircuitBreaker extends CircuitBreaker {
  private channel: BroadcastChannel;
  
  constructor(name: string, config: CircuitBreakerConfig) {
    super(name, {
      ...config,
      onStateChange: (from, to) => {
        // Notify other tabs
        this.channel.postMessage({ type: 'STATE_CHANGE', from, to, name });
        config.onStateChange?.(from, to);
      }
    });
    
    this.channel = new BroadcastChannel(`circuit-breaker-${name}`);
    this.channel.onmessage = (e) => {
      if (e.data.type === 'STATE_CHANGE' && e.data.to === 'OPEN') {
        // Another tab opened the circuit — honor it
        this.forceOpen(config.timeout);
      }
    };
  }
}
```

**Why this matters:** Without tab sync, tab B continues hammering a dead API while tab A has already opened its circuit, doubling server load from your own app.

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Electrical analogy is perfect:** When too much current (failures) flows, the circuit trips (OPEN). After a cooling period (timeout), you flip the breaker back (HALF-OPEN probe). If everything is OK (success threshold), the circuit is reset (CLOSED).

**States:** CLOSED → normal | OPEN → fast fail | HALF-OPEN → one probe

**Only opens on:** 5xx + timeouts + network errors. NEVER on 4xx.

**If you go blank:** "Circuit breaker has three states — closed (normal), open (fast-fail, no network), half-open (probe to test recovery). Separate breaker per service. Cache + degrade gracefully when open."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **UX**: Fast fail in <1ms vs 30s timeout hang — user gets degraded content immediately
→ **Server health**: Stops thundering herd retries from amplifying the outage
→ **Business**: High-profile incidents at Adobe/Microsoft are measured in millions of dollars per minute of downtime; circuit breakers are the last line of frontend defence

**How it works:**
→ Failure counter increments on each 5xx/timeout. When it exceeds the threshold, state → OPEN. All calls throw `CircuitOpenError` immediately. After `timeout` ms, one probe is allowed. If it succeeds, state → CLOSED and counters reset.

**Company relevance:**
→ **Microsoft**: Teams, SharePoint have multiple backend services per page — circuit breakers are standard in their FE architecture
→ **Adobe**: Creative Cloud has media, identity, billing services — each gets its own breaker; billing failure shouldn't break image editing
→ **Cisco**: Network management APIs can be slow/unavailable — dashboard must continue showing last-known state when circuit opens
→ **Salesforce**: Apex governor limits can cause sudden 5xx floods — LWC components need breakers to avoid hammering Salesforce servers
