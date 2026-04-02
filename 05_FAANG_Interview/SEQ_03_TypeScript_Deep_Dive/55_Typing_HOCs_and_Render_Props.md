# 55. Typing HOCs and Render Props
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

HOCs (Higher Order Components) wrap a component and inject additional props. The TypeScript challenge is separating injected props from own props precisely — using generics to pick up the wrapped component's own props, then subtracting the injected ones so callers don't need to provide them. Render props type the function-as-children or render prop with the correct argument types. Both patterns are largely superseded by hooks, but they appear in legacy code and are still tested in senior React TypeScript interviews.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### HOC Pattern — The Core Type Challenge

An HOC takes a component of type `ComponentType<Props>` and returns a new component where the injected Props are removed from what the consumer must provide.

**Step 1 — understand `ComponentPropsWithoutRef<T>`:**
```typescript
// For HTML elements:
type DivProps = React.ComponentPropsWithoutRef<'div'>;
// = all div attributes without ref

// For React components:
type ButtonProps = React.ComponentPropsWithoutRef<typeof Button>;
// = the props interface of Button
```

**Step 2 — basic HOC with injected props:**
```typescript
// What the HOC injects
interface WithLoadingProps {
  isLoading: boolean;
}

// HOC function
function withLoading<P extends WithLoadingProps>(
  WrappedComponent: React.ComponentType<P>
) {
  // OwnProps = P minus the injected WithLoadingProps
  type OwnProps = Omit<P, keyof WithLoadingProps>;

  function WithLoadingComponent({ isLoading, ...props }: P) {
    if (isLoading) return <div className="spinner">Loading...</div>;
    return <WrappedComponent {...(props as P)} />;
  }

  WithLoadingComponent.displayName =
    `WithLoading(${WrappedComponent.displayName ?? WrappedComponent.name})`;

  return WithLoadingComponent as React.ComponentType<OwnProps>;
}
```

**Wait — this has a problem.** `Omit<P, keyof WithLoadingProps>` removes the injected props, but the returned component is typed as `OwnProps` while internally we still access all `P` props. Let's see the correct pattern:

**The correct HOC pattern — injected props removed from external interface:**
```typescript
interface WithThemeProps {
  theme: Theme;
}

function withTheme<P extends object>(
  WrappedComponent: React.ComponentType<P & WithThemeProps>
) {
  // External props = P (what callers provide) — WithThemeProps is injected internally
  function WithThemeWrapper(props: P) {
    const theme = useTheme(); // hook provides the injected value
    return <WrappedComponent {...props} theme={theme} />;
  }

  WithThemeWrapper.displayName =
    `WithTheme(${WrappedComponent.displayName ?? WrappedComponent.name})`;

  return WithThemeWrapper;
}

// Usage
interface UserCardProps {
  userId: string;
  theme: Theme;  // required when defined directly
}

function UserCard({ userId, theme }: UserCardProps) {
  return <div style={{ color: theme.primary }}>{userId}</div>;
}

const ThemedUserCard = withTheme(UserCard);
// ThemedUserCard: React.ComponentType<{ userId: string }>
// theme is injected — callers don't provide it

<ThemedUserCard userId="123" /> // ✅ — no theme needed
<ThemedUserCard userId="123" theme={...} /> // ❌ — TypeScript error: theme not expected
```

**`ComponentPropsWithRef` pattern for ref forwarding in HOCs:**
```typescript
function withLogging<T extends React.ElementType>(Component: T) {
  type Props = React.ComponentPropsWithRef<T>;

  const WithLogging = React.forwardRef<
    React.ElementRef<T>,
    React.ComponentPropsWithoutRef<T>
  >((props, ref) => {
    console.log('Rendering:', Component);
    return <Component {...props} ref={ref} />;
  });

  WithLogging.displayName = `WithLogging(${
    typeof Component === 'string' ? Component : Component.displayName ?? Component.name
  })`;

  return WithLogging;
}
```

### Render Props Pattern

Render props type the function argument(s) precisely:

```typescript
// Basic render prop — function as children
interface MousePositionProps {
  children: (position: { x: number; y: number }) => React.ReactNode;
}

function MouseTracker({ children }: MousePositionProps) {
  const [pos, setPos] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div onMouseMove={handleMouseMove} style={{ height: '100vh' }}>
      {children(pos)}
    </div>
  );
}

// Usage — TypeScript knows x and y are numbers
<MouseTracker>
  {({ x, y }) => <p>Mouse at {x}, {y}</p>}
</MouseTracker>
```

**Generic render prop:**
```typescript
interface DataProviderProps<T> {
  data: T[];
  render: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function DataProvider<T>({ data, render, keyExtractor }: DataProviderProps<T>) {
  return (
    <ul>
      {data.map((item, i) => (
        <li key={keyExtractor(item)}>{render(item, i)}</li>
      ))}
    </ul>
  );
}

// Usage — T inferred from data array type
<DataProvider
  data={orders}                     // data: SalesOrder[]
  keyExtractor={o => o.id}          // o: SalesOrder — inferred
  render={(order) => (              // order: SalesOrder — inferred
    <span>{order.orderNumber}</span>
  )}
/>
```

### Hooks vs HOCs vs Render Props

```typescript
// All three achieve the same: injecting mouse position into a component

// 1. HOC
const TrackedButton = withMouseTracking(Button);

// 2. Render prop
<MouseTracker render={({ x, y }) => <Button label={`${x},${y}`} />} />

// 3. Hook — simplest, most composable
function Button() {
  const { x, y } = useMousePosition(); // ← preferred modern approach
  return <button>At {x},{y}</button>;
}
```

**When HOCs are still the right choice (legacy codebases):**
- Class components can't use hooks — HOCs are the only option for injecting behavior
- When wrapping third-party components you can't modify
- When you need to intercept render itself (not just inject values)

### ⚠️ Anti-Patterns & Pitfalls

- **`props as any` in HOC internals** — a common lazy fix for spread type errors in HOCs. Use `{...props as P}` only with the concrete type, never raw `any`.
- **Losing `displayName`** — HOC-wrapped components show as `Component` in React DevTools. Always set `displayName`.
- **Prop collision** — if the injected prop name conflicts with the wrapped component's OwnProps, behavior is undefined. Namespace injected props: `__withTheme_theme` — or use hooks instead.
- **Deep HOC chains losing types** — `withA(withB(withC(Component)))` causes TypeScript to struggle with nested generic inference. Flatten HOC chains or convert to hooks.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
At SAP Labs, the legacy Fiori React codebase used class components for critical order processing flows — hooks weren't available to them. A `withODataContext<T>(ServiceClass)` HOC injected the OData service instance, typed with the entity type T, into class components. The TypeScript generic ensured the injected `service` prop was typed as `ODataService<T>`, not as `any`. At Bosch, the performance monitoring HOC (`withPerfTracking`) used `ComponentPropsWithoutRef<T>` and spread all props through cleanly — the wrapped component's TypeScript types were completely preserved, only the timing logic was injected.

**At FAANG scale:**
- **Microsoft:** Office React component library has class-component-based HOCs for telemetry injection — `withTelemetry<P>` patterns are used in Teams codebase
- **Adobe:** React Spectrum's older packages use render props for composable overlay positioning — `<Overlay render={({ position }) => ...}>`
- **Salesforce:** LWC-React bridge uses HOC patterns to inject platform capabilities into React components running inside LWC
- **Cisco:** Webex SDK legacy React components use HOCs for meeting context injection — migration to hooks is ongoing

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "HOCs have a TypeScript challenge: removing injected props from the external interface. The cleanest pattern is constraining the wrapped component's props to include the injected type — `P extends object` where the wrapped component receives `P & InjectedProps` — so the HOC wrapper only exposes `P` to callers. The `displayName` is always set for DevTools. For render props, the typing is straightforward — the render function argument is typed with the data shape the component provides. Both patterns are legacy today; I'd reach for a hook instead. But they appear in any codebase older than 2019 and in component libraries that wrap class components."

### Likely Follow-up Questions
1. **What is `ComponentPropsWithoutRef<T>` vs `ComponentPropsWithRef<T>`?** → `WithoutRef` excludes the `ref` prop; `WithRef` includes it. Use `WithoutRef` for most HOCs unless you're explicitly forwarding refs.
2. **How do you preserve the wrapped component's prop types in a HOC?** → Constrain the generic to include the injected props: `P extends InjectedProps` and return `ComponentType<Omit<P, keyof InjectedProps>>`
3. **Why do HOCs need `displayName`?** → React DevTools shows component names from `displayName` or `.name`. HOC-wrapped components lose their original name — setting displayName restores meaningful DevTools debugging.
4. **When would you still use a HOC instead of a hook?** → Class components, wrapping third-party components, when you need to intercept the render itself (error boundaries, Suspense wrappers)

### How to Signal Senior Thinking
> "The migration path from HOCs to hooks is the most common TypeScript refactor I've led. The pattern: identify what the HOC injects, turn that into a custom hook, then delete the HOC wrapper. The key insight is that HOCs inject into props — hooks inject into the function scope. The TypeScript types simplify dramatically: no more generic component type gymnastics, just `const value = useMyHook()` with the same inferred type. The only case where HOCs remain irreplaceable is class components — which is why legacy codebases still have them."

---

## 💻 5. Code Example

```typescript
// ─── withAuth HOC — inject user, hide component if unauthenticated ───

interface WithAuthProps {
  currentUser: User;
}

function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P & WithAuthProps>
) {
  function Authenticated(props: P) {
    const { user, status } = useAuthState();

    if (status === 'loading')          return <Spinner />;
    if (status === 'unauthenticated') return <Redirect to="/login" />;
    // status === 'authenticated': user is non-null
    return <WrappedComponent {...props} currentUser={user!} />;
  }

  Authenticated.displayName =
    `withAuth(${WrappedComponent.displayName ?? WrappedComponent.name ?? 'Component'})`;

  return Authenticated;
}

// ─── Usage ───────────────────────────────────────────────────────────

interface DashboardProps {
  title: string;
  currentUser: User; // injected by withAuth
}

function Dashboard({ title, currentUser }: DashboardProps) {
  return <h1>{title} — Welcome {currentUser.name}</h1>;
}

const ProtectedDashboard = withAuth(Dashboard);
// Type: React.ComponentType<{ title: string }> — currentUser removed

<ProtectedDashboard title="Orders" />          // ✅
<ProtectedDashboard title="Orders" currentUser={u} /> // ❌ currentUser not expected

// ─── Generic render props — typed data provider ──────────────────────

interface InfiniteListProps<T> {
  fetchPage:     (page: number) => Promise<T[]>;
  keyExtractor:  (item: T) => string;
  renderItem:    (item: T) => React.ReactNode;
  renderLoading: () => React.ReactNode;
  renderEmpty:   () => React.ReactNode;
}

function InfiniteList<T>({
  fetchPage,
  keyExtractor,
  renderItem,
  renderLoading,
  renderEmpty,
}: InfiniteListProps<T>) {
  const [items, setItems] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setLoading(true);
    fetchPage(page).then(newItems => {
      setItems(prev => [...prev, ...newItems]);
      setLoading(false);
    });
  }, [page]);

  if (loading && items.length === 0) return <>{renderLoading()}</>;
  if (!loading && items.length === 0) return <>{renderEmpty()}</>;

  return (
    <ul>
      {items.map(item => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
      {loading && renderLoading()}
    </ul>
  );
}

// Usage — T inferred as SalesOrder from fetchPage's return type
<InfiniteList<SalesOrder>
  fetchPage={async (page) => fetchOrders({ page })}
  keyExtractor={order => order.id}
  renderItem={order => <OrderCard order={order} />}  // order: SalesOrder ✅
  renderLoading={() => <Spinner />}
  renderEmpty={() => <p>No orders found</p>}
/>
```

---

## 🧠 6. Memory Aid

**Mental Model:** HOC = component transformer. Generic P absorbs wrapped component props. Remove injected props from external interface with Omit. Set displayName. Prefer hooks for new code.

**If you go blank:** "HOC: `function withX<P extends object>(Component: ComponentType<P & InjectedProps>)` returns component typed as `ComponentType<P>`. Render prop: type the children function with the injected argument type. Always set displayName."

**Mnemonic:** **HOC = Handle Own, Constrain; Render Prop = type the function argument; both → prefer hooks**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: HOCs in legacy codebases need correct typing to prevent prop-bleed errors (injected props leaking to DOM as HTML attributes)  
→ Performance: Improperly typed HOC ref forwarding prevents parent components from managing focus — accessibility and performance impact  
→ Business: Senior-level React interviews require HOC typing knowledge even if hooks are preferred — legacy codebases at scale still use them

**How it works (3 sentences):**
An HOC is a function generic over `P` (the wrapped component's props), constraining `P` to include injected props (so TypeScript knows P has them), and returning a component typed as `P` minus the injected props (using `Omit`). Render props type the children/render prop as a function whose argument type matches the data the component provides — generic render props infer `T` from the `data` prop, flowing the type through to render callback arguments. Both patterns are superseded by hooks for new code, but remain essential for class component injection and third-party component wrapping.

**Company relevance:**
- Microsoft: Teams web client has a significant HOC layer from pre-hooks era — TypeScript HOC patterns are tested in system design and code review rounds
- Adobe: Spectrum v1 uses render props extensively for overlay positioning — understanding these is required for Adobe platform interviews
- Salesforce: LWC-React integration uses HOC patterns for capability injection — platform-level TypeScript is expected at Salesforce staff level
- Cisco: Legacy Webex React components use HOC patterns; migration to hooks ongoing — both patterns expected in interviews

---
**✅ Topic 55/486 complete.**
**→ Continuing to Topic 56: tsconfig Deep Dive**
