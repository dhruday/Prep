# 109. Error Boundaries
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Error boundaries are React components that catch JavaScript errors in their child component tree, log the error, and render a fallback UI instead of crashing the entire application. They must be class components because they use `getDerivedStateFromError` (update state to trigger fallback render) and `componentDidCatch` (side effects like logging). There is no hook equivalent for this lifecycle — function components cannot be error boundaries. `react-error-boundary` is the de facto library that wraps this class component pattern into a convenient `<ErrorBoundary>` component with a `useErrorBoundary()` hook for imperative throwing. Critical limitation: error boundaries only catch errors in the React render cycle — they do NOT catch errors in event handlers, async code, or server-side rendering.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Minimal Error Boundary Implementation

```typescript
interface Props { children: React.ReactNode; fallback: React.ReactNode }
interface State { hasError: boolean; error: Error | null }

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // ① Render phase: update state to show fallback
  //    Called synchronously during render when a child throws
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // ② Commit phase: log errors, report to monitoring
  //    info.componentStack = the component tree trace
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error);
    console.error('Component stack:', info.componentStack);
    // Report to monitoring service
    reportToSentry(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

### What Error Boundaries DO Catch

```typescript
// ✅ Caught: errors during rendering (in render method / function component body)
function BrokenComponent({ user }: { user: null }) {
  return <div>{user.name}</div>;  // TypeError: Cannot read properties of null
  // ^ This throws during React's render phase → caught by error boundary
}

// ✅ Caught: errors in lifecycle methods
class BrokenLifecycle extends React.Component {
  componentDidUpdate() {
    throw new Error('lifecycle error');  // caught
  }
  render() { return <div />; }
}

// ✅ Caught: errors in constructor
class BrokenConstructor extends React.Component {
  constructor(props: {}) {
    super(props);
    throw new Error('constructor error');  // caught
  }
  render() { return <div />; }
}
```

### What Error Boundaries DO NOT Catch

```typescript
// ❌ NOT caught: errors in event handlers
function ClickHandler() {
  function handleClick() {
    throw new Error('event handler error');  // NOT caught by error boundary
    // Use try/catch here manually
  }
  return <button onClick={handleClick}>Click</button>;
}

// ❌ NOT caught: async code (setTimeout, Promise, async/await)
function AsyncError() {
  useEffect(() => {
    setTimeout(() => {
      throw new Error('async error');  // NOT caught — outside React's render cycle
    }, 100);

    fetch('/api/data')
      .then(data => {
        throw new Error('promise error');  // NOT caught
      });
  }, []);
  return <div />;
}

// ✅ Workaround for async errors: re-throw in render
function AsyncErrorWithBoundary() {
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  useEffect(() => {
    fetchData()
      .catch(err => setAsyncError(err));  // store async error in state
  }, []);

  if (asyncError) throw asyncError;  // throw in render → error boundary catches it

  return <div />;
}

// ❌ NOT caught: SSR errors (server-side rendering)
// ❌ NOT caught: errors in the error boundary component itself
```

### react-error-boundary — Production Pattern

```typescript
import {
  ErrorBoundary,
  useErrorBoundary,
  withErrorBoundary
} from 'react-error-boundary';

// — Fallback component —
function ErrorFallback({
  error,
  resetErrorBoundary
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

// — Usage with resetKeys (auto-reset when route changes) —
function App() {
  const [params] = useSearchParams();

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => reportToSentry(error, info)}
      onReset={() => console.log('reset')}
      resetKeys={[params.toString()]}  // reset when URL changes (navigation)
    >
      <ProductPage />
    </ErrorBoundary>
  );
}

// — useErrorBoundary hook: throw errors from event handlers / async —
function DataGrid() {
  const { showBoundary } = useErrorBoundary();

  async function loadData() {
    try {
      const data = await fetchGridData();
      setData(data);
    } catch (err) {
      showBoundary(err);  // propagates error to nearest error boundary
    }
  }

  return <button onClick={loadData}>Load</button>;
}

// — withErrorBoundary HOC pattern —
const SafeProductGrid = withErrorBoundary(ProductGrid, {
  FallbackComponent: ErrorFallback,
  onError: (error) => reportToSentry(error),
});
```

### Error Boundary Placement Strategy

```typescript
// ❌ Too granular: wrapping every component
// Every <Button>, <Input>, etc. → massive overhead, error fallback at pixel level
function App() {
  return (
    <ErrorBoundary ...>
      <ErrorBoundary ...>
        <Button />  {/* overkill */}
      </ErrorBoundary>
    </ErrorBoundary>
  );
}

// ✅ Recommended: boundary per independent feature/section
function App() {
  return (
    <ErrorBoundary FallbackComponent={AppCrashPage}>      {/* ① Top-level Safety Net */}
      <Navigation />
      <main>
        <ErrorBoundary FallbackComponent={SidebarError}>  {/* ② Per major section */}
          <Sidebar />
        </ErrorBoundary>
        <ErrorBoundary FallbackComponent={ContentError}>  {/* ③ Independent content area */}
          <Routes>
            <Route path="/" element={
              <ErrorBoundary FallbackComponent={PageError}> {/* ④ Per route/page */}
                <HomePage />
              </ErrorBoundary>
            } />
          </Routes>
        </ErrorBoundary>
        <ErrorBoundary FallbackComponent={WidgetError}>   {/* ⑤ Critical standalone widgets */}
          <RecommendationsCarousel />
        </ErrorBoundary>
      </main>
    </ErrorBoundary>
  );
}
// If Sidebar crashes: only sidebar shows error fallback, rest of app is fine
// If HomePage crashes: only content area shows fallback, navigation still works
```

### Production Error Boundary with Sentry Integration

```typescript
import * as Sentry from '@sentry/react';

// Option 1: Sentry's built-in error boundary
function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={<ErrorPage />}
      showDialog  // shows "report a bug" popup to user after error
    >
      <AppContent />
    </Sentry.ErrorBoundary>
  );
}

// Option 2: Custom boundary with manual Sentry reporting
class ProdErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, eventId: null as string | null };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const eventId = Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } }
    });
    this.setState({ eventId });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong</h2>
          <button onClick={() => Sentry.showReportDialog({ eventId: this.state.eventId! })}>
            Report this issue
          </button>
          <button onClick={() => this.setState({ hasError: false })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, a third-party charting library (Highcharts wrapper) occasionally threw during render when passed malformed data from the OData API. Without error boundaries, the entire dashboard panel crashed (white screen). Adding per-widget error boundaries meant only the broken chart showed a fallback ("Chart unavailable — refresh to retry") while the rest of the dashboard remained functional. The `componentDidCatch` logged to the internal SAP monitoring system, which PMs could correlate with backend API issues.

**At FAANG scale:**
- **Microsoft:** Azure Portal wraps each blade (panel) in its own error boundary — a broken storage account blade doesn't crash the entire portal
- **Adobe:** Creative Cloud web app has per-tool error boundaries (Photoshop web, Illustrator web each independently guarded)
- **Salesforce:** Each Lightning component in the App Builder is wrapped in granular error boundaries — one broken widget doesn't break the entire page layout
- **Cisco:** Each WebEx widget (meeting list, participant grid, chat panel) has independent error boundaries — critical path components (meeting join button) have dedicated monitoring

---

## 💬 4. Interview Execution

### Sample Answer

> "Error boundaries catch JavaScript errors in React's render cycle, log them, and show a fallback UI instead of crashing the app. They must be class components because the required lifecycle methods — `getDerivedStateFromError` and `componentDidCatch` — don't have hook equivalents. In practice, I use the `react-error-boundary` library, which wraps the class component pattern and adds a `useErrorBoundary` hook for propagating errors from event handlers and async code — the most common gap.
>
> The critical thing to communicate: error boundaries only catch render-time errors. They do NOT catch event handler errors (use try/catch), async errors (use `useErrorBoundary().showBoundary`), or SSR errors.
>
> For placement, I think in terms of independent failure domains — navigation, sidebar, main content area, individual route pages, and standalone widgets like recommendation carousels or analytics panels. Each gets its own boundary. If a recommendation widget crashes, the product page still loads. That's the whole point.
>
> In production, I connect `componentDidCatch` to Sentry, capturing the `componentStack` from `ReactErrorInfo` — it gives you the component tree at the point of failure, which is invaluable for debugging."

---

## 💻 5. Code Example

```typescript
import React, { useState, useEffect } from 'react';
import { ErrorBoundary, useErrorBoundary } from 'react-error-boundary';

// ========================
// Feature-level Error Boundary setup
// ========================

interface FallbackProps { error: Error; resetErrorBoundary: () => void }

function FeatureFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" style={{ padding: '16px', border: '1px solid #f00' }}>
      <h3>This section failed to load</h3>
      <details>
        <summary>Error details</summary>
        <pre>{error.message}</pre>
      </details>
      <button onClick={resetErrorBoundary}>Retry</button>
    </div>
  );
}

// ========================
// Async error propagation via useErrorBoundary
// ========================

function DataWidget({ widgetId }: { widgetId: string }) {
  const { showBoundary } = useErrorBoundary();
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchWidgetData(widgetId)
      .then(result => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          showBoundary(err);  // ← propagates async error to nearest ErrorBoundary
        }
      });

    return () => { cancelled = true; };
  }, [widgetId, showBoundary]);

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {data.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  );
}

// ========================
// Dashboard: granular error boundaries per widget
// ========================

function Dashboard() {
  const [routeKey, setRouteKey] = useState('home');

  return (
    <ErrorBoundary FallbackComponent={FeatureFallback} resetKeys={[routeKey]}>
      <div className="dashboard">
        <aside>
          <ErrorBoundary
            FallbackComponent={({ resetErrorBoundary }) => (
              <div>Sidebar unavailable <button onClick={resetErrorBoundary}>Retry</button></div>
            )}
          >
            <DataWidget widgetId="sidebar-nav" />
          </ErrorBoundary>
        </aside>

        <main>
          <ErrorBoundary
            FallbackComponent={FeatureFallback}
            onError={(error, info) => {
              // Log to monitoring
              console.error('[Dashboard:MainContent] Error:', error.message);
              console.error('Component stack:', info.componentStack);
            }}
          >
            <DataWidget widgetId="main-content" />
          </ErrorBoundary>

          {/* Recommendations: failure doesn't affect main content */}
          <ErrorBoundary
            fallback={<div>Recommendations unavailable</div>}
          >
            <DataWidget widgetId="recommendations" />
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
}

// Type stubs
declare function fetchWidgetData(id: string): Promise<string[]>;
declare function reportToSentry(error: Error, context?: any): string;
```

---

## 🧠 6. Memory Aid

**Error boundary = circuit breaker for React component trees.**

When a circuit (component) fails, the breaker (error boundary) trips and isolates the damage — the rest of the circuit (app) keeps running.

**Catches (in render cycle):**
- render() / JSX evaluation
- lifecycle methods
- constructors of child components

**Does NOT catch (outside render cycle):**
- Event handlers → use try/catch
- Async code (Promises, setTimeout) → use `showBoundary()`
- SSR → server had its own error handling
- The boundary itself → uncaught

**Placement rule:** one boundary per **independent failure domain** (page, feature section, standalone widget).

**Mnemonic:** **RLSS** — **R**ender, **L**ifecycle, **SSR-no**, **S**ync-only catches.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Production resilience: in a real app, third-party widgets, data-driven components, and user-generated content all have undefined edge cases — without error boundaries, one null reference in a child component crashes the entire React tree to a blank screen
→ User experience: Facebook's engineering blog noted that catching errors in independent parts of the UI (comments section, recommendations) prevents total page failure; isolation is a product requirement at scale
→ Interview signal: correctly distinguishing what error boundaries DO vs DO NOT catch (and the async workaround with `useErrorBoundary`) is a concrete senior-level signal that separates "I know what error boundaries are" from "I've used them in production"

**How it works (2 sentences):**
React implements error boundaries using JavaScript's exception propagation — when a component throws during rendering, React walks up the fiber tree looking for the nearest class component with `getDerivedStateFromError`, calls it synchronously during the render phase to get new state (typically `{ hasError: true }`), and then re-renders that component with the new state, which causes it to render the fallback instead of its children.
`componentDidCatch` runs separately in the commit phase (after the fallback is painted) and is intended for side effects like logging — it receives both the error and a React-generated `componentStack` string that traces the exact component hierarchy that led to the failure.

---
✅ Topic 109/486 complete → Continuing to Topic 110: Portal Pattern
