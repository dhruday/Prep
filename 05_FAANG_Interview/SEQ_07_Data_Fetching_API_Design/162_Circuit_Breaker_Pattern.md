# 162. Circuit Breaker Pattern
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

The circuit breaker pattern prevents a client from repeatedly hitting a failing service, accumulating timeouts and wasting resources. It models a physical circuit breaker: when failures exceed a threshold, the breaker "opens" and immediately rejects requests without attempting to contact the failing service — fail fast. After a configurable timeout, it enters "half-open" state, allowing one probe request. If the probe succeeds, the circuit "closes" (normal operation resumes); if it fails, the circuit opens again for another cycle. On the frontend, circuit breakers are relevant for: non-critical third-party services (analytics, chat widgets, marketing integrations), micro-frontend service dependencies, and API gateways where one downstream service failing should not cascade to the entire page. The pattern prevents a failing analytics service from hanging every user interaction waiting for timeouts to expire.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Circuit Breaker State Machine

```
                     failures >= threshold
CLOSED ──────────────────────────────────────► OPEN
  ↑                                               │
  │         probe succeeds                        │ timeout expires
  │◄──────────────────── HALF-OPEN ◄──────────────┘
                             │
                             │ probe fails
                             ▼
                           OPEN (reset timeout)

CLOSED: All requests pass through; failure count tracked
OPEN:   All requests rejected immediately (fail-fast); no network calls
HALF-OPEN: One probe request allowed; success → CLOSED, failure → OPEN
```

### Implementation

```typescript
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold: number;    // Failures before opening (e.g., 5)
  successThreshold: number;    // Successes in HALF_OPEN before closing (e.g., 2)
  timeoutMs: number;           // How long to stay OPEN before probing (e.g., 30_000)
  onStateChange?: (state: CircuitState) => void;
}

class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(opts: CircuitBreakerOptions) {
    this.options = { onStateChange: () => {}, ...opts };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime ?? 0);

      if (timeSinceLastFailure < this.options.timeoutMs) {
        // Circuit is open and timeout hasn't elapsed — fail fast
        throw new CircuitOpenError(`Circuit breaker OPEN. Retry in ${
          Math.ceil((this.options.timeoutMs - timeSinceLastFailure) / 1000)
        }s`);
      }

      // Timeout elapsed — transition to HALF_OPEN for probe
      this.transition('HALF_OPEN');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.transition('CLOSED');
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Probe failed — reopen immediately
      this.successCount = 0;
      this.transition('OPEN');
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.transition('OPEN');
    }
  }

  private transition(newState: CircuitState): void {
    if (this.state !== newState) {
      this.state = newState;
      if (newState === 'CLOSED') {
        this.failureCount = 0;
        this.successCount = 0;
      }
      this.options.onStateChange(newState);
    }
  }

  get isOpen(): boolean { return this.state === 'OPEN'; }
  get currentState(): CircuitState { return this.state; }
}

class CircuitOpenError extends Error {
  readonly name = 'CircuitOpenError';
}
```

### Circuit Breaker for Analytics (Real Frontend Use Case)

```typescript
// Non-critical service: analytics should never block the main application
// Without circuit breaker: if analytics API is down, every tracked event
// waits for a 30-second HTTP timeout before failing → app feels frozen

const analyticsBreaker = new CircuitBreaker({
  failureThreshold: 3,     // Open after 3 consecutive failures
  successThreshold: 1,     // Close after 1 probe success
  timeoutMs: 60_000,       // Wait 60s before probing (analytics can be flaky)
  onStateChange: (state) => {
    console.warn(`[Analytics] Circuit breaker ${state}`);
    // Could send telemetry about circuit state to a different monitoring system
  },
});

class AnalyticsService {
  async track(event: AnalyticsEvent): Promise<void> {
    try {
      await analyticsBreaker.execute(() =>
        fetch('/api/analytics', {
          method: 'POST',
          body: JSON.stringify(event),
          // Short timeout — fail fast to not block user interactions
          signal: AbortSignal.timeout(3000),
        })
      );
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        // Circuit is open — silently drop the event (analytics is non-critical)
        // Optionally cache to localStorage for later replay
        return;
      }
      // Network/server error — also drop silently for analytics
      console.warn('[Analytics] Event dropped:', error);
    }
  }
}

// Main app interaction — analytics failure never blocks user
async function handleAddToCart(productId: string) {
  // This always runs, even if analytics circuit is open
  await api.cart.addItem(productId);

  // Fire-and-forget analytics — circuit open = instant return
  analytics.track({ event: 'add_to_cart', productId }).catch(() => {});
}
```

### Circuit Breaker per Service

```typescript
// Production setup: separate circuit breaker per external service
// Each service can independently fail without affecting others

const circuitBreakers = {
  analytics: new CircuitBreaker({ failureThreshold: 3, successThreshold: 1, timeoutMs: 60_000 }),
  chatWidget: new CircuitBreaker({ failureThreshold: 2, successThreshold: 1, timeoutMs: 30_000 }),
  featureFlags: new CircuitBreaker({ failureThreshold: 5, successThreshold: 2, timeoutMs: 10_000 }),
  paymentGateway: new CircuitBreaker({ failureThreshold: 2, successThreshold: 3, timeoutMs: 15_000 }),
  // Payment: lower threshold (open faster) + higher successThreshold (close slower — must be confident)
};

// Service wrapper
function withCircuitBreaker<T>(
  service: keyof typeof circuitBreakers,
  operation: () => Promise<T>,
  fallback?: T
): Promise<T> {
  return circuitBreakers[service].execute(operation).catch(error => {
    if (error instanceof CircuitOpenError || fallback !== undefined) {
      return fallback as T;
    }
    throw error;
  });
}
```

### Circuit Breaker for Micro-Frontend Dependencies

```typescript
// Micro-frontend scenario: Shell app loads remote MFEs
// If the "Orders" MFE remote is down, it shouldn't crash the "Profile" MFE

// React lazy + circuit breaker:
async function loadRemoteModule(scope: string, module: string): Promise<React.ComponentType> {
  const breaker = remoteBreakers[scope] ?? new CircuitBreaker({
    failureThreshold: 2,
    successThreshold: 1,
    timeoutMs: 30_000,
  });
  remoteBreakers[scope] = breaker;

  return breaker.execute(async () => {
    // Module Federation dynamic import
    await __webpack_init_sharing__('default');
    const container = (window as Window & { [key: string]: WebpackContainer })[scope];
    await container.init(__webpack_share_scopes__.default);
    const factory = await container.get(module);
    return factory().default;
  });
}

// Usage with ErrorBoundary fallback:
function OrdersPanel() {
  const OrdersRemote = React.lazy(() =>
    loadRemoteModule('ordersApp', './OrdersPanel').catch(() => {
      // Return a fallback component when circuit opens
      return { default: () => <ServiceUnavailable service="Orders" /> };
    })
  );

  return (
    <Suspense fallback={<PanelSkeleton />}>
      <OrdersRemote />
    </Suspense>
  );
}
```

### Dashboard UX During Open Circuit

```typescript
// When circuit is open for a critical service: show degraded but functional state
// Never show a full error page for a non-critical service failure

function DashboardWidget({
  service,
  children,
}: {
  service: keyof typeof circuitBreakers;
  children: React.ReactNode;
}) {
  const breaker = circuitBreakers[service];
  const [isOpen, setIsOpen] = useState(breaker.isOpen);

  useEffect(() => {
    const original = breaker['options'].onStateChange;
    breaker['options'].onStateChange = (state) => {
      original(state);
      setIsOpen(state === 'OPEN');
    };
  }, [breaker]);

  if (isOpen) {
    return (
      <div className="widget widget--degraded" aria-label="Service unavailable">
        <p>
          {service} is temporarily unavailable.
          <button onClick={() => setIsOpen(false)}>Retry</button>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
```

### ⚠️ Anti-Patterns

- **Single global circuit breaker** — one breaker for all services means a flaky analytics endpoint opens the circuit and blocks all API calls including critical ones; always have per-service breakers

- **Too-low failure threshold** — a threshold of 1 (circuit opens on first failure) treats every transient error as a service outage; combine with a sliding window (failures within last 60s) and circuit breaks after N% failure rate; minimum threshold of 3–5 for most services

- **Not implementing HALF_OPEN state** — without HALF_OPEN, a circuit that opens never automatically recovers; users are permanently blocked from the service until a manual reset; HALF_OPEN is mandatory for autonomous recovery

- **Circuit breaker for idempotency-safe operations only** — don't wrap mutations that create new records (POST /orders) in a circuit breaker without careful thought; the circuit open state drops requests silently; for mutations, prefer explicit error handling and user notification over silent dropping

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the third-party analytics integration (SAP Web Analytics SDK) occasionally had network issues causing 30-second timeouts per tracked event. Since every UI interaction fired an analytics event, the entire SAP UI5 application appeared to freeze during analytics outages. Added a circuit breaker with `failureThreshold: 3`, `timeoutMs: 60_000`, and a 3-second `AbortSignal.timeout` per request. During analytics outages, events are silently dropped after the circuit opens; the application remains fully functional; analytics issues are visible only in monitoring dashboards.

**At FAANG scale:**
- **Microsoft:** Azure Portal — each ARM service call to a specific resource provider (e.g., Compute, Networking, Storage) has an independent circuit breaker; if the Storage resource provider is down, the Compute page still works; circuit state is visible in the Portal as "Some services may be unavailable — Service Health →"
- **Adobe:** Creative Cloud Desktop App — circuit breaker around the asset sync service; when sync is failing (network change, service maintenance), the app opens the circuit, shows "Sync paused" in the UI, and queues changes locally; circuit probes every 5 minutes and closes when sync recovers
- **Salesforce:** Einstein Analytics integration — circuit breaker wraps the Analytics API calls in Lightning experience; when circuit opens, dashboard tiles show "Analytics temporarily unavailable" individually rather than breaking the whole record page
- **Cisco:** DNA Center integrations — circuit breakers around each device platform API (Catalyst, Meraki, ACI); if the Meraki API is down, the Catalyst portion of the dashboard continues working; Meraki widgets show "Meraki cloud not reachable"

---

## 💬 4. Interview Execution

### Sample Answer

> "The circuit breaker pattern solves a cascading failure problem. Without it, when a downstream service is down, every call to it waits for a connection timeout — typically 30 seconds — before failing. If 100 user interactions per second are each waiting 30 seconds, you accumulate 3,000 pending requests, memory builds up, and the entire frontend becomes unresponsive.
>
> The circuit breaker short-circuits this: after a threshold of failures, it transitions to OPEN state and immediately throws `CircuitOpenError` without touching the network. Fail-fast means 0ms failure instead of 30s failure.
>
> Three states: CLOSED (normal, failures counted), OPEN (fail-fast, waiting for timeout), HALF_OPEN (one probe request allowed; success closes it, failure reopens). HALF_OPEN is essential — without it, the circuit never self-heals.
>
> In frontend applications, I use circuit breakers for non-critical services like analytics, chat widgets, and feature flag APIs. I never use them as a substitute for error handling on critical paths — if `/api/users/me` fails, I want to show an error state, not silently return null. The circuit breaker is for services where silent degradation is acceptable."

### Likely Follow-up Questions
1. "How do you choose the failure threshold?" → Too low (1): opens on every transient error, never actually closed; too high (50): many failures before protection kicks in. For external services: 3–5 consecutive failures or 50% failure rate over a 30-second window. For payment: 2–3 consecutive (risk-sensitive). For analytics: 5+ (high tolerance for transient failures). The threshold should reflect how quickly you want the circuit to open vs how tolerant you are of false positives
2. "What do you show users when the circuit is open?" → For non-critical features (analytics, recommendations): nothing visible — silently degrade. For somewhat-important features (chat, notifications): gray out the widget with "Temporarily unavailable" and a retry button. For important features (search, dashboard data): show the last cached data with a "Data may be outdated" banner. Never show a full error page for a non-critical circuit
3. "What's the difference between circuit breaker and retry with backoff?" → Retry with backoff: assumes the failure is transient and keeps trying. Circuit breaker: assumes there's a systemic failure and stops trying to protect both client and server. They're complementary: implement retry with backoff for transient errors, and wrap the operation in a circuit breaker to open after persistent failures. When the circuit opens, retries stop entirely until probing begins in HALF_OPEN

---

## 💻 5. Code Example (TypeScript)

```typescript
// React hook for circuit-breaker-wrapped queries

function useCircuitBreakerQuery<T>({
  service,
  queryKey,
  queryFn,
  fallback,
}: {
  service: keyof typeof circuitBreakers;
  queryKey: unknown[];
  queryFn: () => Promise<T>;
  fallback?: T;
}) {
  const breaker = circuitBreakers[service];

  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await breaker.execute(queryFn);
      } catch (error) {
        if (error instanceof CircuitOpenError) {
          if (fallback !== undefined) return fallback;
          throw error;  // Let TanStack Query handle if no fallback
        }
        throw error;
      }
    },
    retry: (count, err) => {
      if (err instanceof CircuitOpenError) return false;  // Don't retry when circuit is open
      return count < 3;
    },
  });
}

// Usage:
function RecommendationsWidget() {
  const { data: recommendations = [], isError } = useCircuitBreakerQuery({
    service: 'recommendations',
    queryKey: ['recommendations', userId],
    queryFn: () => api.recommendations.getForUser(userId),
    fallback: [],  // Empty list when circuit is open — widget gracefully renders "nothing yet"
  });

  if (recommendations.length === 0) return null;  // No widget shown when degraded

  return <RecommendationsList items={recommendations} />;
}
```

---

## 🧠 6. Memory Aid

**COH state machine:**
- **C**LOSED: counting failures, normal operation
- **O**PEN: fail-fast, no requests, waiting for timeout
- **H**ALF-OPEN: one probe — success→CLOSED, failure→OPEN

**"The power grid analogy":**
Circuit breaker in your home: when too much current flows (failures), the breaker trips (OPEN) — power immediately cut, no fuse burning. After inspection (timeout), flip it back (HALF-OPEN test). If all is well, stays on (CLOSED). If it trips again immediately, something is still wrong.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Without a circuit breaker, a 30-second connection timeout per failed analytics call × 60 user interactions per minute = 30 simultaneous pending requests at any given time; the JavaScript event loop isn't blocked (async), but the bandwidth is consumed, the Promise chain occupies memory, and from the user's perspective there's no visible issue — until the service recovers and floods of queued requests all complete simultaneously, causing a mini-spike
→ The HALF_OPEN state is what makes the circuit breaker pattern self-healing rather than requiring manual intervention — without it, an opened circuit becomes a permanent feature flag that requires a developer or operations team to manually reset; HALF_OPEN allows autonomous recovery after `timeoutMs` without human intervention
→ Per-service circuit breakers are a micro-resilience pattern — they ensure that a failure in one external dependency (analytics, chat, feature flags) doesn't cascade to degrade or block other dependencies; the granularity should match the service boundary, not the API endpoint

**How it works (2 sentences):**
The circuit breaker wraps an async operation: in CLOSED state, it executes the operation and tracks the failure count; when `failureCount >= failureThreshold`, it transitions to OPEN and all subsequent `execute()` calls immediately throw `CircuitOpenError` — the operation function is never called, so no network request is made and the failure response is instantaneous.
After `timeoutMs` milliseconds in OPEN state, the next `execute()` call transitions to HALF_OPEN and allows one real operation attempt: if it succeeds, `successCount` is incremented until `successThreshold` is reached and the circuit closes; if it fails, `lastFailureTime` is updated and the circuit returns to OPEN for another full `timeoutMs` timeout cycle.

---
✅ Topic 162/486 complete → Continuing to Topic 163: Graceful API Degradation
