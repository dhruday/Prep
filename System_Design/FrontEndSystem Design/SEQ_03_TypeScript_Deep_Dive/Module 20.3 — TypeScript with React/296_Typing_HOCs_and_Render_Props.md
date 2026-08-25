# 296 – Typing HOCs and Render Props

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Higher-Order Components (HOCs) and Render Props are React patterns that predate hooks but are still relevant for understanding legacy code and certain use cases. **HOCs** are functions that take a component and return an enhanced component — typing them requires preserving the wrapped component's props while adding injected ones. **Render Props** pass rendering control to a child via a function prop. Both require careful TypeScript typing to maintain type safety across the delegation boundary.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Typing HOCs

```typescript
// HOC that injects "user" prop
interface WithUserProps { user: User; }

function withUser<P extends WithUserProps>(
  WrappedComponent: React.ComponentType<P>
): React.FC<Omit<P, keyof WithUserProps>> {
  return function WithUserComponent(props: Omit<P, keyof WithUserProps>) {
    const user = useAuth();
    return <WrappedComponent {...(props as P)} user={user} />;
  };
}

// Usage
interface ProfileProps { user: User; showAvatar: boolean; }
function Profile({ user, showAvatar }: ProfileProps) { /* ... */ }

const ProfileWithUser = withUser(Profile);
// <ProfileWithUser showAvatar={true} /> — user is injected, not required
```

### Typing Render Props

```typescript
// Render prop with typed callback
interface MouseTrackerProps {
  render: (position: { x: number; y: number }) => React.ReactNode;
}

function MouseTracker({ render }: MouseTrackerProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);
  return <>{render(pos)}</>;
}

// Children as render prop
interface DataFetcherProps<T> {
  url: string;
  children: (state: AsyncState<T>) => React.ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const state = useFetch<T>(url);
  return <>{children(state)}</>;
}
```

### When Each Pattern Still Applies

| Pattern | Still Useful For | Prefer Instead |
|---------|-----------------|----------------|
| HOC | Class component enhancement, cross-cutting concerns | Custom hooks |
| Render Props | Component libraries offering full render control | Headless hooks |
| Hooks | Everything else — primary reuse mechanism | — |

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, our older Angular codebase used HOC-equivalent patterns (decorators). When migrating to React, we converted HOCs to custom hooks for simpler TypeScript typing and better composition. Understanding both patterns helped bridge the migration.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"HOCs require careful typing: the return type should be `Omit<P, keyof InjectedProps>` so consumers don't need to provide injected props. Render props need typed callback parameters. The key TypeScript challenge with HOCs is preserving the wrapped component's prop types while subtracting injected ones. Today, I prefer custom hooks for reuse — they're simpler to type and compose. But I understand HOCs for legacy code and libraries that still use them."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Type-safe HOC: withLoading
interface WithLoadingProps { isLoading: boolean; }

function withLoading<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return function LoadingComponent(props: P & WithLoadingProps) {
    const { isLoading, ...rest } = props;
    if (isLoading) return <Spinner />;
    return <WrappedComponent {...(rest as P)} />;
  };
}

// Type-safe render prop: generic data table
interface RenderTableProps<T> {
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  renderHeader: () => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
}

function RenderTable<T>({ data, renderRow, renderHeader, renderEmpty }: RenderTableProps<T>) {
  if (data.length === 0 && renderEmpty) return <>{renderEmpty()}</>;
  return <table><thead>{renderHeader()}</thead><tbody>{data.map(renderRow)}</tbody></table>;
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"HOC typing: Omit injected props from consumer-facing type. Render props: type the callback parameters."** HOCs: `withX<P extends InjectedProps>(C: ComponentType<P>): FC<Omit<P, keyof InjectedProps>>`. Modern preference: custom hooks over HOCs/render props.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Understanding legacy patterns for codebase maintenance and library comprehension.
**How:** HOC: Omit injected props. Render props: type callback params. Prefer hooks for new code.
**Companies:** Legacy codebases at all four companies still use HOCs. Understanding them is expected.
