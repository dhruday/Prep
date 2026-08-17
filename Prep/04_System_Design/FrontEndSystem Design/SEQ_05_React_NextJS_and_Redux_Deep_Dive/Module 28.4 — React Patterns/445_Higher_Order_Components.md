# 445 – Higher-Order Components (HOCs)

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
A **Higher-Order Component** is a function that takes a component and returns a new enhanced component. `const Enhanced = withFeature(BaseComponent)`. Used for cross-cutting concerns (auth, logging, theming). Largely superseded by hooks but still found in legacy codebases and some libraries.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── BASIC HOC ────
function withLoading<P extends object>(
  WrappedComponent: React.ComponentType<P>,
) {
  return function WithLoadingComponent(props: P & { isLoading: boolean }) {
    const { isLoading, ...rest } = props;
    if (isLoading) return <Spinner />;
    return <WrappedComponent {...(rest as P)} />;
  };
}

const UserListWithLoading = withLoading(UserList);
// <UserListWithLoading isLoading={loading} users={users} />

// ──── AUTH HOC ────
function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
) {
  return function WithAuthComponent(props: P) {
    const { user, isLoading } = useAuth();
    
    if (isLoading) return <Spinner />;
    if (!user) return <Navigate to="/login" />;
    
    return <WrappedComponent {...props} />;
  };
}

const ProtectedDashboard = withAuth(Dashboard);

// ──── LOGGING HOC ────
function withLogger<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string,
) {
  return function WithLoggerComponent(props: P) {
    useEffect(() => {
      console.log(`${componentName} mounted with props:`, props);
      return () => console.log(`${componentName} unmounted`);
    });
    
    return <WrappedComponent {...props} />;
  };
}

// ──── HOC WITH CONFIGURATION ────
function withTheme(theme: 'light' | 'dark') {
  return function <P extends { theme: string }>(
    WrappedComponent: React.ComponentType<P>,
  ) {
    return function WithThemeComponent(props: Omit<P, 'theme'>) {
      return <WrappedComponent {...(props as P)} theme={theme} />;
    };
  };
}

const DarkButton = withTheme('dark')(Button);

// ──── COMPOSING HOCs ────
// Problem: wrapper hell with multiple HOCs
const EnhancedComponent = withAuth(withLoading(withLogger(MyComponent, 'MyComponent')));

// Better: compose utility
function compose(...fns: Function[]) {
  return (component: any) => fns.reduceRight((acc, fn) => fn(acc), component);
}
const EnhancedComponent2 = compose(withAuth, withLoading, withLogger)(MyComponent);

// ──── HOC BEST PRACTICES ────
// 1. Don't mutate the original component
// 2. Pass through unrelated props
// 3. Set displayName for DevTools
// 4. Don't use HOCs inside render
function withFeature<P>(Wrapped: React.ComponentType<P>) {
  const WithFeature = (props: P) => <Wrapped {...props} />;
  WithFeature.displayName = `WithFeature(${Wrapped.displayName || Wrapped.name})`;
  return WithFeature;
}

// ──── HOC vs HOOK COMPARISON ────
// HOC: withAuth(Dashboard)  →  Hook: useAuth() inside Dashboard
// HOC: withRouter(Page)     →  Hook: useRouter() inside Page
// HOC: connect(mapState)(C) →  Hook: useSelector() inside C
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"HOCs wrap components to add behavior — withAuth, withLoading, connect(). Problems: wrapper hell, prop collision, hard to trace. Hooks replaced most HOC use cases. Still used in Redux connect(), some logging/analytics wrappers. Legacy pattern — prefer hooks for new code."*

## 4. 🧠 MEMORY AID
**"HOC = function(Component) → EnhancedComponent. Cross-cutting: auth, logging, theme. Hooks replaced most uses. compose() for multiple HOCs."**
