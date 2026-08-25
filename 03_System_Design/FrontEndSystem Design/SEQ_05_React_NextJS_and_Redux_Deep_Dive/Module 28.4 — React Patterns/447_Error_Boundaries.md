# 447 – Error Boundaries

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Error Boundaries** catch JavaScript errors in the component tree during rendering, lifecycle methods, and constructors. They display a fallback UI instead of crashing the entire app. Must be **class components** (no hook equivalent yet). Wrap sections of UI to contain failures.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── ERROR BOUNDARY CLASS ────
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  // Update state so next render shows fallback UI
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  // Log error to monitoring service
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div role="alert">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ──── USAGE: Granular boundaries ────
function App() {
  return (
    <ErrorBoundary fallback={<h1>App crashed</h1>}>
      <Header /> {/* if Header crashes, entire app shows fallback */}
      
      <ErrorBoundary fallback={<p>Feed unavailable</p>}>
        <NewsFeed /> {/* contained: only feed shows error */}
      </ErrorBoundary>
      
      <ErrorBoundary fallback={<p>Chat unavailable</p>}>
        <Chat /> {/* contained: only chat shows error */}
      </ErrorBoundary>
    </ErrorBoundary>
  );
}

// ──── RESETTABLE ERROR BOUNDARY (with key) ────
function ProfilePage({ userId }: { userId: string }) {
  return (
    <ErrorBoundary key={userId}> {/* resets on userId change */}
      <UserProfile userId={userId} />
    </ErrorBoundary>
  );
}

// ──── react-error-boundary LIBRARY (popular) ────
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
      resetKeys={[userId]} // auto-reset when userId changes
    >
      <Dashboard />
    </ReactErrorBoundary>
  );
}

function ErrorFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert">
      <p>Error: {error.message}</p>
      <button onClick={resetErrorBoundary}>Retry</button>
    </div>
  );
}

// ──── WHAT ERROR BOUNDARIES DON'T CATCH ────
// ❌ Event handlers (use try/catch)
// ❌ Async code (promises, setTimeout)
// ❌ Server-side rendering
// ❌ Errors in the boundary itself
```

### When to Place Boundaries
| Level | Scope | Example |
|---|---|---|
| Root | Entire app | App-level crash page |
| Route | Per page | Page-level error |
| Feature | Per widget | Widget fallback |
| Component | Individual | Image load error |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Error Boundaries catch render errors and show fallback UI. getDerivedStateFromError for fallback state, componentDidCatch for logging. Must be class components. Don't catch: event handlers, async code, SSR. Place granularly — route level, feature level. Use key prop or resetKeys to reset. react-error-boundary library adds hooks integration."*

## 4. 🧠 MEMORY AID
**"ErrorBoundary: getDerivedStateFromError (fallback) + componentDidCatch (log). Class only. Doesn't catch events/async. Granular placement. key={id} to reset."**
