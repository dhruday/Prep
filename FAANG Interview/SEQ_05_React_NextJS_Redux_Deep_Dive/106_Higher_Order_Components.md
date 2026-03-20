# 106. Higher-Order Components (HOC) — Use Cases & Pitfalls
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

A Higher-Order Component (HOC) is a function that takes a component and returns a new enhanced component. It's a composition pattern for adding cross-cutting concerns (authentication, logging, theming, data fetching) to components without modifying them. Pre-hooks, HOCs were the primary way Redux's `connect()` and React Router's `withRouter()` worked. Today, custom hooks cover most HOC use cases with less boilerplate and better debugging (no wrapper hell in DevTools). HOCs remain appropriate when you need to modify component props declaratively (adding props, wrapping in a specific DOM structure), in class component codebases, or when integrating with patterns from older libraries. The critical pitfalls: wrapper hell in DevTools, hoisting static methods, forwarding refs, and prop naming collisions.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Anatomy of a HOC

```typescript
// HOC pattern: wraps a component, adding/modifying behavior
function withAuthentication<P extends { user: User }>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<Omit<P, 'user'>> {

  function AuthenticatedComponent(props: Omit<P, 'user'>) {
    const { user, isLoading } = useAuth();

    if (isLoading) return <LoadingSpinner />;
    if (!user) return <Navigate to="/login" />;

    // Inject `user` prop — consumer doesn't need to pass it
    return <WrappedComponent {...(props as P)} user={user} />;
  }

  // Set displayName for DevTools
  AuthenticatedComponent.displayName = `withAuthentication(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return AuthenticatedComponent;
}

// Usage
interface DashboardProps { user: User; dashboardId: string; }
function Dashboard({ user, dashboardId }: DashboardProps) {
  return <div>{user.name}'s dashboard {dashboardId}</div>;
}
const AuthenticatedDashboard = withAuthentication(Dashboard);

// Consumer doesn't provide `user` — HOC injects it
<AuthenticatedDashboard dashboardId="123" />
```

### Ref Forwarding — Critical HOC Requirement

```typescript
// ❌ HOC breaks ref forwarding by default
function withBorder<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return function WithBorderComponent(props: P) {
    return (
      <div style={{ border: '1px solid red' }}>
        <WrappedComponent {...props} />
        {/* ref passed to WithBorderComponent is attached to THIS div, not WrappedComponent */}
      </div>
    );
  };
}

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => <input {...props} ref={ref} />
);

const InputWithBorder = withBorder(Input);
// <InputWithBorder ref={inputRef} />  ← ref goes to div, not input

// ✅ Correct: forward the ref
function withBorder<P extends object, T>(
  WrappedComponent: React.ComponentType<P & React.RefAttributes<T>>
) {
  const WithBorderComponent = React.forwardRef<T, P>((props, ref) => (
    <div style={{ border: '1px solid red' }}>
      <WrappedComponent {...props} ref={ref} />
    </div>
  ));
  WithBorderComponent.displayName = `withBorder(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithBorderComponent;
}
```

### Static Method Hoisting

```typescript
// ❌ HOC loses static methods from the wrapped component
function withLogging<P>(WrappedComponent: React.ComponentType<P>) {
  function WithLogging(props: P) {
    console.log('rendering', WrappedComponent.name);
    return <WrappedComponent {...props} />;
  }
  // WrappedComponent's static methods are NOT copied to WithLogging
  return WithLogging;
}

class UserList extends React.Component {
  static defaultProps = { title: 'Users' };
  static propTypes = { users: PropTypes.array };
  render() { return <div>...</div>; }
}

const EnhancedList = withLogging(UserList);
// EnhancedList.defaultProps → undefined (static methods lost!)

// ✅ Hoist static methods using hoist-non-react-statics
import hoistNonReactStatics from 'hoist-non-react-statics';

function withLogging<P>(WrappedComponent: React.ComponentType<P>) {
  function WithLogging(props: P) { /* ... */ }
  hoistNonReactStatics(WithLogging, WrappedComponent);  // copy static methods
  return WithLogging;
}
```

### Prop Collision Problem

```typescript
// ❌ HOC injects a prop that conflicts with a consumer prop
function withUserData<P extends { user: User }>(WrappedComponent: React.ComponentType<P>) {
  return function(props: Omit<P, 'user'> & { userId: string }) {
    const user = fetchUser(props.userId);
    return <WrappedComponent user={user} {...(props as any)} />;
  };
}

// Composition of two HOCs that both inject `user`:
const Component = withUserData(withPermissions(Dashboard));
// withPermissions also injects `user` → one overrides the other silently

// ✅ Namespace injected props or document them explicitly in TypeScript
interface WithUserDataProps { $userData: { user: User; isFetchingUser: boolean } }
function withUserData<P>(WrappedComponent: React.ComponentType<P & WithUserDataProps>) { ... }
```

### HOC Composition — Classic Pattern

```typescript
// Composing multiple HOCs — readable with a `compose` utility
const enhance = compose(
  withAuthentication,
  withPermissions('admin'),
  withAnalytics('dashboard'),
  connect(mapStateToProps, mapDispatchToProps),
);

const EnhancedDashboard = enhance(Dashboard);
// DevTools shows: connect > withAnalytics > withPermissions > withAuthentication > Dashboard
// This is "wrapper hell" — each HOC adds a component layer

// ✅ Today: custom hooks achieve the same without wrapper hell
function Dashboard() {
  const { user } = useAuthentication();
  const { hasPermission } = usePermissions('admin');
  const { trackEvent } = useAnalytics('dashboard');
  const cartData = useSelector(selectCart);
  // All logic in one flat component — no wrapper layers in DevTools
}
```

### Legitimate HOC Use Cases in Modern React

```typescript
// 1. Class component enhancement (legacy codebases)
class LegacyChart extends React.Component<ChartProps> {
  render() { return <canvas />; }
}
// Cannot use hooks — HOC is the only extension mechanism
const ThemeableChart = withTheme(LegacyChart);

// 2. Third-party library integration (when library exports HOC API)
// Redux connect() (legacy):
const ConnectedComponent = connect(mapStateToProps)(MyComponent);

// 3. Adding structural wrappers that should apply across all instances
function withErrorBoundary<P>(
  WrappedComponent: React.ComponentType<P>,
  FallbackComponent: React.ComponentType
) {
  return class WithErrorBoundary extends React.Component<P, { hasError: boolean }> {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
      if (this.state.hasError) return <FallbackComponent />;
      return <WrappedComponent {...this.props} />;
    }
  };
}
// Error boundary MUST be a class component → HOC is the canonical pattern here

// 4. React.memo (technically a HOC)
const MemoizedComponent = React.memo(Component);
// React.memo is a HOC: React.memo(Component) returns a new component
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, `connect()` from Redux was used extensively (pre-hooks migration). Every container component was a connect HOC. After migrating to Redux Toolkit hooks (`useSelector`, `useDispatch`), the `connect()` wrappers were removed — DevTools view became dramatically cleaner (from 4-layer wrapper trees to flat components). The only remaining HOCs were `withErrorBoundary` (class-based requirement) and `React.memo` wrapping.

**At FAANG scale:**
- **Microsoft:** Teams uses HOC pattern for telemetry logging (`withTelemetry`) on class components; React function components use hooks instead
- **Adobe:** React Spectrum has `forwardRef` HOC wrappers in internal utilities for ref handling in their component compositions
- **Salesforce:** `connect()` (Redux) was widely used; Lightning React components are being migrated to hooks-based patterns
- **Cisco:** Legacy network widget components use `withResizeDetection(Component)` HOC in Java-era codebase; being replaced with `useResizeObserver` hooks

---

## 💬 4. Interview Execution

### Sample Answer

> "HOCs are functions that take a component and return an enhanced component — a way to add cross-cutting concerns like authentication, logging, or analytics without modifying the component directly. Pre-hooks, `connect()` from Redux and `withRouter()` from React Router were the primary examples.
>
> Today, custom hooks handle most of what HOCs did — with less boilerplate and without adding wrapper components to the DevTools tree. My rule of thumb: if you're adding BEHAVIOR that can be expressed as a hook, use a hook. If you're wrapping a component in a structural pattern (error boundaries, which must be class components), or integrating with a library that expects a HOC API, use a HOC.
>
> The three critical implementation requirements for a production HOC: set `displayName` for DevTools readability; use `React.forwardRef` to forward refs through the wrapper correctly; use `hoist-non-react-statics` to copy static methods from the wrapped component. Missing any of these causes subtle bugs.
>
> `React.memo` is technically a HOC — it's worth noting because it shows HOCs still have a place, just a narrow one."

---

## 💻 5. Code Example

```typescript
import React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';

// ========================
// Production-quality HOC template
// ========================
function withFeatureFlag<P extends object>(
  flagName: string,
  FallbackComponent: React.ComponentType<P> | null = null
) {
  return function<T>(WrappedComponent: React.ComponentType<P & React.RefAttributes<T>>) {

    const WithFeatureFlag = React.forwardRef<T, P>((props, ref) => {
      const flags = useFeatureFlags();  // custom hook

      if (!flags[flagName]) {
        return FallbackComponent ? <FallbackComponent {...props} /> : null;
      }

      return <WrappedComponent {...props} ref={ref} />;
    });

    // Required: displayName for React DevTools
    WithFeatureFlag.displayName = `withFeatureFlag(${flagName})(${
      WrappedComponent.displayName || WrappedComponent.name || 'Component'
    })`;

    // Required: hoist static methods
    hoistNonReactStatics(WithFeatureFlag, WrappedComponent);

    return WithFeatureFlag;
  };
}

// Usage: component only renders if 'NEW_DASHBOARD' flag is enabled
const NewDashboard = withFeatureFlag('NEW_DASHBOARD', OldDashboard)(DashboardV2);

// ========================
// Error Boundary HOC (class component requirement)
// ========================
interface ErrorBoundaryState { hasError: boolean; error: Error | null }

function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  FallbackComponent: React.ComponentType<{ error: Error | null }>
) {
  class WithErrorBoundary extends React.Component<P, ErrorBoundaryState> {
    static displayName = `withErrorBoundary(${
      WrappedComponent.displayName || WrappedComponent.name
    })`;

    constructor(props: P) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
      // Log to monitoring
      console.error('Component error:', error, info);
    }

    render() {
      if (this.state.hasError) {
        return <FallbackComponent error={this.state.error} />;
      }
      return <WrappedComponent {...this.props} />;
    }
  }

  hoistNonReactStatics(WithErrorBoundary, WrappedComponent);
  return WithErrorBoundary;
}

// Usage: wraps any component with error boundary
const SafeProductGrid = withErrorBoundary(
  ProductGrid,
  ({ error }) => <div>Failed to render products: {error?.message}</div>
);

// Type stubs
declare function useFeatureFlags(): Record<string, boolean>;
declare function OldDashboard(props: any): JSX.Element;
declare function DashboardV2(props: any): JSX.Element;
declare function ProductGrid(props: any): JSX.Element;
```

---

## 🧠 6. Memory Aid

**HOC = component factory. Adds behavior, not UI. Takes component → returns component.**

**Three mandatory HOC requirements:**
1. `displayName`
2. `React.forwardRef`
3. `hoistNonReactStatics`

**When to use HOC today:**
- Class component (can't use hooks)
- `withErrorBoundary` (class boundary required)
- `React.memo` (a HOC itself)
- Third-party library requires HOC API

**Mnemonic:** **DRHS** — **D**isplayName set, **R**ef forwarded, **H**oist statics, **S**kip for function components (use hooks instead).

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Legacy literacy: large codebases (SAP, Salesforce, Microsoft) have extensive HOC usage from the Redux `connect()` era — ability to work with, maintain, and migrate them is professionally important
→ Pattern tradeoffs: explaining why hooks replaced most HOC use cases, and knowing the specific cases where HOCs remain appropriate, is a senior-level communication signal
→ `React.memo` is a HOC — a common interview "gotcha" that demonstrates pattern literacy

**How it works (2 sentences):**
A HOC is a JavaScript function that accepts a React component (or component constructor) as input and returns a new component that renders the input component with additional props, wrappers, or lifecycle behavior — exploiting the fact that React components are plain JavaScript functions or classes that can be composed like any other function.
The major limitations of HOCs — wrapper hell (each HOC adds a component layer visible in DevTools), static method loss (not automatically copied to the wrapper), and ref breakage (refs attach to the wrapper, not the wrapped component) — are the exact problems that React hooks were designed to eliminate, which is why hooks are now preferred for all cross-cutting concerns that don't strictly require class component lifecycle behavior.

---
✅ Topic 106/486 complete → Continuing to Topic 107: Container vs Presentational Components
