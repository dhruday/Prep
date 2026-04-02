# 107. Container vs Presentational Components
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Container vs Presentational is an architectural pattern popularized by Dan Abramov in 2015 that separates components by responsibility: Containers are the "smart" components — they connect to data sources, manage state, perform side effects, and pass data down. Presentational components are the "dumb" components — they describe how things look, receive all data via props, and have no data logic or external connections. Pre-hooks, this separation was a critical technique because stateful logic could only live in class components. Post-hooks, Dan Abramov himself updated his article to say the distinction is "not as useful as I thought it was" — custom hooks can extract the data/logic from any function component. However, the mental model remains powerful as an architectural principle for testability and separation of concerns, especially at scale with teams.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Classic Pattern (Pre-Hooks)

```typescript
// ❌ Without the pattern: logic and UI mixed (hard to test)
class UserProfilePage extends React.Component {
  state = { user: null, loading: true, error: null };

  async componentDidMount() {
    const user = await fetchUser(this.props.userId);
    this.setState({ user, loading: false });
  }

  render() {
    if (this.state.loading) return <Spinner />;
    return (
      <div>
        <h1>{this.state.user.name}</h1>
        <p>{this.state.user.email}</p>
        <button onClick={() => this.setState({ editing: true })}>Edit</button>
      </div>
    );
  }
}
// Testing the UI requires setting up API mocks every time
```

### Classic Pattern (Split)

```typescript
// ✅ Container: only data/logic, no markup decisions
class UserProfileContainer extends React.Component {
  state = { user: null, loading: true, error: null };

  async componentDidMount() {
    try {
      const user = await fetchUser(this.props.userId);
      this.setState({ user, loading: false });
    } catch (error) {
      this.setState({ error, loading: false });
    }
  }

  render() {
    return (
      <UserProfileView
        user={this.state.user}
        loading={this.state.loading}
        error={this.state.error}
      />
    );
  }
}

// ✅ Presentational: only markup, no data knowledge
interface UserProfileViewProps {
  user: User | null;
  loading: boolean;
  error: Error | null;
}
function UserProfileView({ user, loading, error }: UserProfileViewProps) {
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error.message} />;
  if (!user) return null;
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
// Test UserProfileView with just props — zero API setup needed
// Test UserProfileContainer for correct API call behavior
```

### Modern Pattern — Hooks Replace the Container

```typescript
// ✅ Custom hook = what the Container used to do
function useUserProfile(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchUser(userId)
      .then(data => { if (!cancelled) { setUser(data); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId]);

  return { user, loading, error };
}

// ✅ Presentational component unchanged — same pure view
function UserProfileView({ user, loading, error }: UserProfileViewProps) {
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error.message} />;
  if (!user) return null;
  return <div><h1>{user.name}</h1><p>{user.email}</p></div>;
}

// ✅ Page component: hook instead of container wrapper class
function UserProfilePage({ userId }: { userId: string }) {
  const { user, loading, error } = useUserProfile(userId);
  return <UserProfileView user={user} loading={loading} error={error} />;
}

// Hook can be shared by multiple page components
// Presentational component is still fully tested in isolation with props
```

### Where the Distinction Still Matters in Modern React

```typescript
// 1. Co-location strategy at the folder level
//    Even with hooks, teams at scale separate "smart" files from "dumb" files

// src/features/dashboard/
//   DashboardPage.tsx         ← Container: hooks, data orchestration
//   components/
//     DashboardLayout.tsx     ← Presentational: UI structure
//     StatCard.tsx            ← Presentational: pure UI
//     ChartPanel.tsx          ← Presentational: pure UI
//   hooks/
//     useDashboardData.ts     ← Extracted container logic

// 2. Storybook: presentational components are story-friendly
//    Containers with hooks/context need mocking setup
//    Pure presentational components: just pass props to stories

// 3. Design System: all design system components are presentational
//    Consumers provide data — component just renders it
//    Button, Card, Modal, Table in a design system = always presentational

// 4. Testing strategy: different test types
//    Presentational → unit tests with @testing-library/react, just render with props
//    Container/Page → integration tests with mocked hooks or actual hooks + MSW
```

### Redux Connect Pattern (Container via HOC)

```typescript
// Redux pre-hooks: connect() created the container HOC
// mapStateToProps = what data does this container pull from Redux?
// mapDispatchToProps = what actions does it expose?

interface OwnProps { productId: string }
interface StateProps { product: Product | null; loading: boolean }
interface DispatchProps { fetchProduct: (id: string) => void; addToCart: (product: Product) => void }
type Props = OwnProps & StateProps & DispatchProps;

// Presentational component — no Redux knowledge
function ProductCard({ product, loading, addToCart }: Props) {
  if (loading) return <Spinner />;
  return (
    <div>
      <h2>{product?.name}</h2>
      <button onClick={() => product && addToCart(product)}>Add to Cart</button>
    </div>
  );
}

// Container: connect() provides mapStateToProps + mapDispatchToProps
const ProductCardContainer = connect(
  (state: RootState, ownProps: OwnProps): StateProps => ({
    product: selectProduct(state, ownProps.productId),
    loading: selectProductLoading(state),
  }),
  (dispatch): DispatchProps => ({
    fetchProduct: (id) => dispatch(fetchProductAction(id)),
    addToCart: (product) => dispatch(addToCartAction(product)),
  })
)(ProductCard);

// ✅ Modern Redux: hooks make connect() unnecessary
function ProductCard({ productId }: OwnProps) {
  const product = useSelector((state) => selectProduct(state, productId));
  const loading = useSelector(selectProductLoading);
  const dispatch = useDispatch();
  // container and presentational merged via hooks
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP Labs, the SAP Fiori React components followed container/presentational strictly. Every UI component in the component library was presentational — designers owned the markup. Feature teams created container components that connected to OData services via Redux. After migrating to RTK, the container class components became pages with hooks — but the presentational components stayed unchanged. Separation at the file level (container components in `pages/`, pure components in `components/`) was mandated in code review.

**At FAANG scale:**
- **Microsoft:** Office React team separates "business logic components" (data-connected) from "fabric UI" components (presentational, in the Fluent UI library) — explicit architectural boundary
- **Adobe:** React Spectrum is entirely presentational (design system); consumers add data layer
- **Salesforce:** Lightning Web Components explicitly distinguishes "data components" (connected) from "UI components" (presentational) in their architecture guide
- **Cisco:** WebEx widget library: all presentational; device data handling is in separate services

---

## 💬 4. Interview Execution

### Sample Answer

> "Container vs Presentational is Dan Abramov's pattern for separating how your component gets its data from how it renders it. Containers connect to data sources, own state, and run side-effects. Presentational components just describe the UI based on props they receive — they're functionally pure in the sense that given the same props, they always render the same UI.
>
> Pre-hooks, this was a critical technique because stateful logic required class components. Today, a custom hook is a better 'container' — same separation of concerns, but without an extra wrapper component in the tree. Abramov himself noted this.
>
> However, the mental model is still valuable. We still colocate data fetching logic away from UI components by putting it in custom hooks. We still build design system components that are purely presentational. We still test UI components by passing props in isolation without needing API setup. The separation just happens at the file level between hooks and components, not between container component and presentational component classes.
>
> The biggest ongoing relevance is for design systems — every component in a shared library MUST be presentational, otherwise it can't work across different data environments."

---

## 💻 5. Code Example

```typescript
// ========================
// Modern "Container" = Page component using hooks
// Presentational = pure view component
// ========================

// — Presentational Component (reusable, testable in isolation) —
interface UserListProps {
  users: User[];
  isLoading: boolean;
  error: string | null;
  onUserClick: (userId: string) => void;
}

// Pure view: given same props → same output
// Test: render with props, no mocking needed
export function UserList({ users, isLoading, error, onUserClick }: UserListProps) {
  if (isLoading) return <div role="status">Loading users...</div>;
  if (error) return <div role="alert">Error: {error}</div>;
  if (users.length === 0) return <div>No users found</div>;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id} onClick={() => onUserClick(user.id)}>
          {user.name} — {user.email}
        </li>
      ))}
    </ul>
  );
}

// — Custom Hook = the "container" logic —
function useUsers() {
  const users = useSelector(selectAllUsers);
  const isLoading = useSelector(selectUsersLoading);
  const error = useSelector(selectUsersError);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchUsersThunk());
  }, [dispatch]);

  const handleUserClick = useCallback((userId: string) => {
    dispatch(selectUserAction(userId));
  }, [dispatch]);

  return { users, isLoading, error, handleUserClick };
}

// — Page Component = connects hook + view —
export function UsersPage() {
  const { users, isLoading, error, handleUserClick } = useUsers();
  return (
    <div>
      <h1>Users</h1>
      <UserList
        users={users}
        isLoading={isLoading}
        error={error}
        onUserClick={handleUserClick}
      />
    </div>
  );
}

// ========================
// Tests: dramatically different complexity
// ========================

// Testing UserList (presentational) — zero setup:
// render(<UserList users={mockUsers} isLoading={false} error={null} onUserClick={vi.fn()} />)
// expect(screen.getByText('Alice')).toBeInTheDocument();

// Testing UsersPage (container) — needs Redux store mock:
// render(<Provider store={mockStore}><UsersPage /></Provider>)

// Storybook story for UserList — just prop variants:
// export const Loading = { args: { users: [], isLoading: true, error: null } }
// export const Error   = { args: { users: [], isLoading: false, error: 'Network failed' } }
// export const Full    = { args: { users: mockUsers, isLoading: false, error: null } }

// Type stubs
declare function useSelector<T>(selector: (state: any) => T): T;
declare function useDispatch(): (action: any) => void;
declare function useCallback<T extends Function>(fn: T, deps: any[]): T;
declare function fetchUsersThunk(): any;
declare function selectUserAction(id: string): any;
declare const selectAllUsers: (state: any) => User[];
declare const selectUsersLoading: (state: any) => boolean;
declare const selectUsersError: (state: any) => string | null;
interface User { id: string; name: string; email: string }
```

---

## 🧠 6. Memory Aid

**Simple analogy:**
- Container = waiter (goes to kitchen, fetches food, carries it out)
- Presentational = the plate and table setting (just displays what's placed on it)

**The evolution timeline:**
1. Pre-hooks: Container **class** → passes data to Presentational **function**
2. Post-hooks: Custom **hook** → passes data to Presentational **function**

The plate (presentational component) never changed. Only the waiter changed (from a class component container to a hook).

**Mnemonic:** **DIPS** — **D**umb components are presentational, **I**nject via props, **P**ure render, **S**mart components connect to data.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Testability: pure presentational components have unit tests that take 3 lines of code — no store setup, no API mocking. Container tests need the full data layer. The split is the difference between fast, isolated tests and slow integration tests
→ Storybook / design systems: you cannot Storybook a container component without mocking its entire data layer. Presentational components have clean, data-free stories
→ Team ownership: design team owns presentational components; feature teams own containers/pages — the pattern makes the handoff boundary explicit

**How it works (2 sentences):**
The separation works by making presentational components accept everything they display through props — they have no state (or only local UI state like "is hover"), no API calls, no store subscriptions, and no side effects — while container components (whether HOC, class component, or page component using hooks) handle all data acquisition and pass it down.
Post-hooks, the pattern evolved: custom hooks replaced container class components, but the presentational component half of the pattern is unchanged and remains the foundation for reusable component libraries, design systems, and Storybook-based component development.

---
✅ Topic 107/486 complete → Continuing to Topic 108: Controlled vs Uncontrolled Components
