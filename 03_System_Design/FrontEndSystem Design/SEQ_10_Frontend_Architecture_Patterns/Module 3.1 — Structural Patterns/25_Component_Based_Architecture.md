# 25. Component-Based Architecture

## 1. High-Level Explanation (Frontend Interview Level)

**Component-Based Architecture** structures UIs as a composition of **reusable, self-contained components** with **encapsulated logic, state, and styling**—fundamental pattern in React, Vue, Angular that enables modularity, reusability, and maintainability by breaking complex UIs into manageable pieces.

**Core Principles**:
- **Encapsulation**: Component owns its state, logic, styles
- **Reusability**: Components used across different contexts
- **Composition**: Complex UIs built from simple components
- **Single Responsibility**: Each component does one thing well

**Key Principle**: "Build UIs from small, reusable, self-contained components that compose together—enables parallel development, easy testing, and maintainability at scale."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Definition & Core Concepts

**Component**: Self-contained UI unit with:
1. **Props** (inputs): Data passed from parent
2. **State** (internal data): Component's own data
3. **Logic** (behavior): Event handlers, effects
4. **Template** (structure): JSX/HTML rendering
5. **Styles** (presentation): CSS/CSS-in-JS

**Example**:
```jsx
// Button component (self-contained)
function Button({ label, onClick, variant = 'primary' }) {
  // Props: label, onClick, variant (inputs)
  const [isLoading, setIsLoading] = useState(false); // State (internal)
  
  // Logic (behavior)
  const handleClick = async () => {
    setIsLoading(true);
    await onClick();
    setIsLoading(false);
  };
  
  // Template (structure)
  return (
    <button 
      className={`btn btn-${variant}`}  {/* Styles */}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? 'Loading...' : label}
    </button>
  );
}

// Usage: Reusable across contexts
<Button label="Save" onClick={handleSave} variant="primary" />
<Button label="Cancel" onClick={handleCancel} variant="secondary" />
```

---

### Component Hierarchy

**Tree Structure**: Components nest to form UI hierarchy.

```jsx
<App>                           {/* Root component */}
  <Header>                      {/* Layout component */}
    <Logo />                    {/* Presentational */}
    <Navigation>                {/* Container */}
      <NavLink to="/" />        {/* Presentational */}
      <NavLink to="/about" />
    </Navigation>
    <UserMenu>                  {/* Container */}
      <Avatar user={user} />    {/* Presentational */}
      <Dropdown>                {/* Presentational */}
        <MenuItem />
        <MenuItem />
      </Dropdown>
    </UserMenu>
  </Header>
  
  <Main>                        {/* Layout component */}
    <Sidebar>                   {/* Layout */}
      <FilterPanel>             {/* Container */}
        <Checkbox />            {/* Presentational */}
        <Checkbox />
      </FilterPanel>
    </Sidebar>
    
    <Content>                   {/* Layout */}
      <ProductList>             {/* Container (data fetching) */}
        <ProductCard />         {/* Presentational */}
        <ProductCard />
        <ProductCard />
      </ProductList>
    </Content>
  </Main>
  
  <Footer />                    {/* Layout component */}
</App>

Hierarchy depth: 5 levels (typical)
Component count: 50-500 (medium app), 1000+ (large app)
```

---

### Component Types

#### 1. **Presentational Components** (Dumb/Stateless)

**Purpose**: Display UI, no business logic.

**Characteristics**:
- **No state**: Pure function of props
- **No side effects**: No API calls, no external dependencies
- **Highly reusable**: Work in any context

**Example**:
```jsx
// Card component (presentational)
function Card({ title, description, image, onAction }) {
  return (
    <div className="card">
      <img src={image} alt={title} />
      <h3>{title}</h3>
      <p>{description}</p>
      <button onClick={onAction}>Learn More</button>
    </div>
  );
}

// Usage: Can display any card data
<Card title="Product A" description="..." image="..." onAction={handleClick} />
<Card title="Article B" description="..." image="..." onAction={handleClick} />
```

**Benefit**: Easy to test (pure function), reusable (no dependencies).

---

#### 2. **Container Components** (Smart/Stateful)

**Purpose**: Manage data, business logic, side effects.

**Characteristics**:
- **Has state**: Fetches/manages data
- **Side effects**: API calls, subscriptions
- **Delegates presentation**: Renders presentational components

**Example**:
```jsx
// ProductList container (smart)
function ProductList({ filters }) {
  // State (data management)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Side effects (data fetching)
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const data = await api.getProducts(filters);
      setProducts(data);
      setLoading(false);
    };
    fetchProducts();
  }, [filters]);
  
  // Delegates presentation
  if (loading) return <Spinner />;
  
  return (
    <div className="product-list">
      {products.map(product => (
        <ProductCard key={product.id} {...product} />  {/* Presentational */}
      ))}
    </div>
  );
}
```

**Benefit**: Separates data logic from UI (easier to maintain, test, reuse).

---

#### 3. **Layout Components** (Structure)

**Purpose**: Define page structure, positioning.

**Example**:
```jsx
// Grid layout component
function Grid({ columns = 3, gap = 16, children }) {
  return (
    <div 
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`
      }}
    >
      {children}
    </div>
  );
}

// Usage
<Grid columns={3} gap={16}>
  <Card />
  <Card />
  <Card />
</Grid>
```

---

#### 4. **Higher-Order Components (HOC)**

**Purpose**: Reuse component logic (wrapper pattern).

**Example**:
```jsx
// HOC: Add loading state to any component
function withLoading(Component) {
  return function WithLoadingComponent({ isLoading, ...props }) {
    if (isLoading) return <Spinner />;
    return <Component {...props} />;
  };
}

// Usage
const ProductListWithLoading = withLoading(ProductList);

<ProductListWithLoading isLoading={loading} products={products} />
```

**Benefit**: Share logic across components (authentication, loading, error handling).

---

#### 5. **Render Props**

**Purpose**: Share logic via prop that's a function.

**Example**:
```jsx
// DataFetcher component (render prop)
function DataFetcher({ url, render }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(url).then(res => res.json()).then(setData).finally(() => setLoading(false));
  }, [url]);
  
  return render({ data, loading });
}

// Usage
<DataFetcher 
  url="/api/products"
  render={({ data, loading }) => (
    loading ? <Spinner /> : <ProductList products={data} />
  )}
/>
```

---

#### 6. **Custom Hooks** (Modern React Pattern)

**Purpose**: Reuse stateful logic (preferred over HOC/Render Props).

**Example**:
```jsx
// Custom hook: useFetch
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);
  
  return { data, loading, error };
}

// Usage: Reuse in any component
function ProductList() {
  const { data, loading, error } = useFetch('/api/products');
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return <div>{data.map(product => <ProductCard {...product} />)}</div>;
}
```

**Benefit**: Cleaner than HOC (no wrapper hell), more flexible than render props.

---

### Component Communication

#### 1. **Props Down** (Parent → Child)

```jsx
// Parent passes data down
function App() {
  const user = { name: 'Alice', role: 'admin' };
  return <UserProfile user={user} />;  {/* Props down */}
}

// Child receives via props
function UserProfile({ user }) {
  return <div>{user.name} ({user.role})</div>;
}
```

---

#### 2. **Events Up** (Child → Parent)

```jsx
// Child emits events up
function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  
  const handleSubmit = () => {
    onSearch(query);  {/* Event up */}
  };
  
  return <input value={query} onChange={e => setQuery(e.target.value)} onSubmit={handleSubmit} />;
}

// Parent handles event
function App() {
  const handleSearch = (query) => {
    console.log('Searching for:', query);
  };
  
  return <SearchBar onSearch={handleSearch} />;  {/* Callback prop */}
}
```

---

#### 3. **Context** (Skip Intermediate Components)

**Problem**: Prop drilling (passing props through many levels).

```jsx
// ❌ Prop drilling (verbose, hard to maintain)
<App user={user}>
  <Header user={user}>
    <UserMenu user={user}>
      <Avatar user={user} />  {/* 4 levels deep */}
    </UserMenu>
  </Header>
</App>
```

**Solution**: Context (skip intermediate components).

```jsx
// ✅ Context (clean, no drilling)
const UserContext = createContext();

function App() {
  const user = { name: 'Alice' };
  
  return (
    <UserContext.Provider value={user}>
      <Header />  {/* No user prop */}
    </UserContext.Provider>
  );
}

function Avatar() {
  const user = useContext(UserContext);  // Access directly
  return <img src={user.avatar} />;
}
```

**Benefit**: Avoid prop drilling (cleaner code).

**Trade-off**: Over-use → tight coupling (components depend on context, less reusable).

---

#### 4. **Global State** (Redux/Zustand)

**Purpose**: Share state across many components (complex apps).

```jsx
// Redux store (global state)
const store = createStore({
  user: { name: 'Alice', cart: [] },
  products: [...],
});

// Component A: Dispatch action
function AddToCartButton({ productId }) {
  const dispatch = useDispatch();
  
  const handleClick = () => {
    dispatch(addToCart(productId));  // Update global state
  };
  
  return <button onClick={handleClick}>Add to Cart</button>;
}

// Component B: Read from store
function CartBadge() {
  const cartCount = useSelector(state => state.user.cart.length);  // Subscribe to state
  
  return <span>{cartCount}</span>;
}

// Components don't need to be related (no parent-child)
```

**Benefit**: Decouple components (no direct communication).

**Trade-off**: Complexity (boilerplate, learning curve), over-use → hard to debug.

---

### Component Lifecycle

**React Class Components** (legacy):
```jsx
class ProductCard extends React.Component {
  componentDidMount() {
    // After mount: Fetch data, add event listeners
    this.fetchProduct();
  }
  
  componentDidUpdate(prevProps) {
    // After update: Re-fetch if props changed
    if (this.props.productId !== prevProps.productId) {
      this.fetchProduct();
    }
  }
  
  componentWillUnmount() {
    // Before unmount: Cleanup (remove listeners, cancel requests)
    this.controller.abort();
  }
  
  render() {
    return <div>{this.state.product.name}</div>;
  }
}
```

**React Hooks** (modern):
```jsx
function ProductCard({ productId }) {
  const [product, setProduct] = useState(null);
  
  useEffect(() => {
    // componentDidMount + componentDidUpdate
    const controller = new AbortController();
    
    fetch(`/api/products/${productId}`, { signal: controller.signal })
      .then(res => res.json())
      .then(setProduct);
    
    // componentWillUnmount (cleanup)
    return () => controller.abort();
  }, [productId]);  // Re-run when productId changes
  
  return <div>{product?.name}</div>;
}
```

**Lifecycle Phases**:
1. **Mount**: Component created, added to DOM
2. **Update**: Props/state change, re-render
3. **Unmount**: Component removed from DOM

---

### Component Performance

#### 1. **Unnecessary Re-Renders**

**Problem**: Parent re-renders → all children re-render (even if props unchanged).

```jsx
// Parent re-renders every second
function App() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    setInterval(() => setCount(c => c + 1), 1000);
  }, []);
  
  return (
    <div>
      <h1>Count: {count}</h1>
      <ExpensiveComponent />  {/* Re-renders every second (unnecessary) */}
    </div>
  );
}

function ExpensiveComponent() {
  console.log('Rendering ExpensiveComponent');  // Logs every second
  // Expensive calculation (wasted on every render)
  const result = expensiveCalculation();
  return <div>{result}</div>;
}
```

**Solution**: `React.memo` (skip re-render if props unchanged).

```jsx
// ✅ Memoized: Only re-renders if props change
const ExpensiveComponent = React.memo(function ExpensiveComponent() {
  console.log('Rendering ExpensiveComponent');  // Logs once
  const result = expensiveCalculation();
  return <div>{result}</div>;
});

// Now: Parent re-renders, but ExpensiveComponent skips (props unchanged)
```

---

#### 2. **Expensive Calculations**

**Problem**: Recalculate on every render (slow).

```jsx
function ProductList({ products, filters }) {
  // ❌ Recalculate on every render (slow if products.length = 10,000)
  const filtered = products.filter(p => p.price < filters.maxPrice);
  
  return <div>{filtered.map(p => <ProductCard {...p} />)}</div>;
}
```

**Solution**: `useMemo` (cache result, only recalculate if dependencies change).

```jsx
function ProductList({ products, filters }) {
  // ✅ Memoized: Only recalculate if products or filters change
  const filtered = useMemo(() => {
    return products.filter(p => p.price < filters.maxPrice);
  }, [products, filters]);
  
  return <div>{filtered.map(p => <ProductCard {...p} />)}</div>;
}
```

---

#### 3. **Recreating Functions**

**Problem**: Functions recreated on every render (breaks `React.memo`).

```jsx
function App() {
  const [count, setCount] = useState(0);
  
  // ❌ Recreated on every render (new reference)
  const handleClick = () => {
    console.log('Clicked');
  };
  
  return <Button onClick={handleClick} />;  {/* Button re-renders (new function reference) */}
}

const Button = React.memo(({ onClick }) => {
  console.log('Rendering Button');  // Logs on every App re-render
  return <button onClick={onClick}>Click</button>;
});
```

**Solution**: `useCallback` (cache function, stable reference).

```jsx
function App() {
  const [count, setCount] = useState(0);
  
  // ✅ Memoized: Same reference across renders
  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);
  
  return <Button onClick={handleClick} />;  {/* Button skips re-render (same function) */}
}
```

---

#### 4. **Large Component Trees**

**Problem**: Deep tree → slow re-renders (React traverses entire tree).

**Solution**: 
1. **Code splitting**: Load components on demand.
2. **Virtualization**: Render only visible items (react-window).
3. **Lazy loading**: `React.lazy` (load components asynchronously).

```jsx
// Code splitting
const Dashboard = React.lazy(() => import('./Dashboard'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Dashboard />  {/* Loaded on demand */}
    </Suspense>
  );
}

// Virtualization (large lists)
import { FixedSizeList } from 'react-window';

function ProductList({ products }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={products.length}  // 10,000 items
      itemSize={100}
    >
      {({ index }) => <ProductCard product={products[index]} />}  {/* Only 10-20 rendered */}
    </FixedSizeList>
  );
}
```

---

### Component Testing

#### 1. **Unit Testing** (Presentational Components)

```jsx
import { render, screen } from '@testing-library/react';

test('Button renders label', () => {
  render(<Button label="Save" onClick={() => {}} />);
  expect(screen.getByText('Save')).toBeInTheDocument();
});

test('Button calls onClick when clicked', () => {
  const handleClick = jest.fn();
  render(<Button label="Save" onClick={handleClick} />);
  
  screen.getByText('Save').click();
  expect(handleClick).toHaveBeenCalled();
});
```

---

#### 2. **Integration Testing** (Container Components)

```jsx
test('ProductList fetches and displays products', async () => {
  // Mock API
  jest.spyOn(api, 'getProducts').mockResolvedValue([
    { id: 1, name: 'Product A' },
    { id: 2, name: 'Product B' },
  ]);
  
  render(<ProductList />);
  
  // Loading state
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  // Products displayed
  await waitFor(() => {
    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('Product B')).toBeInTheDocument();
  });
});
```

---

### Component Patterns

#### 1. **Compound Components** (Implicit Context)

**Purpose**: Related components work together (e.g., `<Tabs>` + `<Tab>`).

```jsx
// Compound component
function Tabs({ children }) {
  const [activeIndex, setActiveIndex] = useState(0);
  
  return (
    <TabsContext.Provider value={{ activeIndex, setActiveIndex }}>
      {children}
    </TabsContext.Provider>
  );
}

function TabList({ children }) {
  return <div className="tab-list">{children}</div>;
}

function Tab({ index, children }) {
  const { activeIndex, setActiveIndex } = useContext(TabsContext);
  const isActive = index === activeIndex;
  
  return (
    <button 
      className={isActive ? 'active' : ''}
      onClick={() => setActiveIndex(index)}
    >
      {children}
    </button>
  );
}

function TabPanel({ index, children }) {
  const { activeIndex } = useContext(TabsContext);
  return activeIndex === index ? <div>{children}</div> : null;
}

// Usage (implicit state sharing)
<Tabs>
  <TabList>
    <Tab index={0}>Tab 1</Tab>
    <Tab index={1}>Tab 2</Tab>
  </TabList>
  <TabPanel index={0}>Content 1</TabPanel>
  <TabPanel index={1}>Content 2</TabPanel>
</Tabs>
```

**Benefit**: Clean API (no prop drilling).

---

#### 2. **Controlled vs Uncontrolled Components**

**Controlled** (React owns state):
```jsx
function Input({ value, onChange }) {
  return <input value={value} onChange={onChange} />;
}

// Usage
const [text, setText] = useState('');
<Input value={text} onChange={e => setText(e.target.value)} />
```

**Uncontrolled** (DOM owns state):
```jsx
function Input() {
  const ref = useRef();
  
  const getValue = () => ref.current.value;
  
  return <input ref={ref} />;
}
```

**Trade-off**: Controlled = React-driven (predictable, easy to validate), Uncontrolled = DOM-driven (simpler, less re-renders).

---

## 3. Clear Real-World Examples

### Example 1: **Airbnb Search Results**

**Component Tree**:
```jsx
<SearchResults>                      {/* Container (data fetching) */}
  <FilterSidebar>                    {/* Layout */}
    <PriceFilter />                  {/* Controlled component */}
    <DateRangePicker />              {/* Compound component */}
    <GuestSelector />
  </FilterSidebar>
  
  <ListingsGrid>                     {/* Layout */}
    <ListingCard />                  {/* Presentational (reusable) */}
    <ListingCard />
    <ListingCard />
  </ListingsGrid>
  
  <MapView>                          {/* Container (map logic) */}
    <MapMarker />                    {/* Presentational */}
    <MapMarker />
  </MapView>
</SearchResults>
```

**Benefits**:
- **Reusable**: `ListingCard` used in search, saved, bookings
- **Testable**: Each component isolated (unit tests)
- **Parallel development**: Teams work on different components

---

### Example 2: **Twitter Feed**

**Component Tree**:
```jsx
<Feed>                               {/* Container (infinite scroll) */}
  <TweetComposer />                  {/* Controlled component */}
  
  <TweetList>                        {/* Virtualized list */}
    <Tweet>                          {/* Presentational */}
      <UserAvatar />                 {/* Presentational */}
      <TweetContent />               {/* Presentational */}
      <TweetActions>                 {/* Container (like/retweet logic) */}
        <LikeButton />               {/* Presentational */}
        <RetweetButton />
        <ReplyButton />
      </TweetActions>
    </Tweet>
  </TweetList>
</Feed>
```

**Optimizations**:
- **Virtualization**: Render only visible tweets (10-20 out of 1000+)
- **Memoization**: `Tweet` memoized (skip re-render if unchanged)
- **Code splitting**: `TweetComposer` lazy-loaded (not needed initially)

---

### Example 3: **Shopify Admin Dashboard**

**Component Tree**:
```jsx
<Dashboard>                          {/* Layout */}
  <Sidebar>                          {/* Layout */}
    <Navigation>                     {/* Container */}
      <NavItem />                    {/* Presentational */}
      <NavItem />
    </Navigation>
  </Sidebar>
  
  <Main>                             {/* Layout */}
    <StatsOverview>                  {/* Container (fetch stats) */}
      <StatCard title="Revenue" />   {/* Presentational */}
      <StatCard title="Orders" />
    </StatsOverview>
    
    <RecentOrders>                   {/* Container (fetch orders) */}
      <DataTable>                    {/* Presentational */}
        <TableRow />
        <TableRow />
      </DataTable>
    </RecentOrders>
  </Main>
</Dashboard>
```

**Design System**: Components from **Polaris** (shared library, consistent UI across teams).

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "Explain component-based architecture."

**Answer**:

"**Component-based architecture** structures UIs as a **composition of reusable, self-contained components** with **encapsulated logic, state, and styling**—fundamental pattern in React/Vue/Angular that enables **modularity, reusability, and maintainability** at scale.

---

### Core Principles

**1. Encapsulation**:
- Component owns its state, logic, styles
- Example: `<Button>` has click handler, loading state, styles

**2. Reusability**:
- Components work in different contexts
- Example: Same `<Card>` for products, articles, user profiles

**3. Composition**:
- Complex UIs from simple components
- Example: `<Dashboard>` = `<Sidebar>` + `<Main>` + `<StatCard>`s

**4. Single Responsibility**:
- Each component does one thing
- Example: `<SearchBar>` handles search, `<SearchResults>` displays results

---

### Component Types

**1. Presentational** (Dumb/Stateless):
- Display UI, no business logic
- Pure function of props (no state, no side effects)
- Example: `<Card title="..." description="..." />` (highly reusable)

**2. Container** (Smart/Stateful):
- Manage data, business logic, side effects
- Fetch data, handle events, update state
- Example: `<ProductList>` fetches products, renders `<ProductCard>`s

**3. Layout**:
- Define structure, positioning
- Example: `<Grid columns={3}>`, `<Sidebar>` + `<Main>`

**4. HOC/Custom Hooks**:
- Reuse logic across components
- Example: `withLoading(Component)`, `useFetch(url)`

---

### Component Communication

**1. Props Down** (Parent → Child):
```jsx
<UserProfile user={user} />  {/* Pass data down */}
```

**2. Events Up** (Child → Parent):
```jsx
<SearchBar onSearch={handleSearch} />  {/* Callback prop */}
```

**3. Context** (Skip intermediate):
```jsx
// Avoid prop drilling (passing props through many levels)
<UserContext.Provider value={user}>
  <Avatar />  {/* Access user directly via useContext */}
</UserContext.Provider>
```

**4. Global State** (Redux/Zustand):
```jsx
// Share state across unrelated components
const cart = useSelector(state => state.cart);  // Component A
dispatch(addToCart(product));                   // Component B
```

---

### Performance

**1. Unnecessary Re-Renders**:
- Problem: Parent re-renders → all children re-render (even if props unchanged)
- Solution: `React.memo` (skip re-render if props unchanged)

**2. Expensive Calculations**:
- Problem: Recalculate on every render (slow if 10,000 items)
- Solution: `useMemo` (cache result, only recalculate if dependencies change)

**3. Recreating Functions**:
- Problem: Functions recreated on every render (breaks `React.memo`)
- Solution: `useCallback` (cache function, stable reference)

**4. Large Trees**:
- Solution: Code splitting (`React.lazy`), virtualization (react-window), lazy loading

---

### Benefits

**1. Modularity**:
- Small, focused components (easier to understand, maintain)
- Example: `<Button>`, `<Card>`, `<Modal>` (clear boundaries)

**2. Reusability**:
- Components used across different contexts
- Example: Same `<Button>` in header, modal, form (DRY principle)

**3. Testability**:
- Isolated components (unit tests)
- Example: Test `<Button>` renders label, calls `onClick` (no dependencies)

**4. Parallel Development**:
- Teams work on different components (no blocking)
- Example: Team A builds `<Header>`, Team B builds `<Dashboard>` (independent)

**5. Maintainability**:
- Changes localized to component (no ripple effects)
- Example: Update `<Button>` styles → all instances updated (single source of truth)

---

### Trade-offs

**1. Over-componentization**:
- Problem: Too many small components (hard to navigate, performance overhead)
- Example: Separate component for every div (overkill)
- Solution: Balance (reuse vs simplicity)

**2. Prop Drilling**:
- Problem: Passing props through many levels (verbose, brittle)
- Solution: Context (for deeply nested data), global state (for cross-cutting concerns)

**3. Tight Coupling**:
- Problem: Components depend on specific props/context (less reusable)
- Solution: Keep components generic (accept data via props, no hard-coded dependencies)

**4. Performance**:
- Problem: Large component trees (slow re-renders)
- Solution: Memoization (`React.memo`, `useMemo`, `useCallback`), virtualization, code splitting

---

### Real-World

**Airbnb**: `<ListingCard>` used in search, saved, bookings (reusable), teams work on different components (parallel development).

**Twitter**: `<Tweet>` component (memoized, skip re-render if unchanged), virtualized feed (render only visible 10-20 out of 1000+).

**Shopify**: Polaris design system (shared component library, consistent UI across teams, `<Button>`, `<Card>`, `<DataTable>`).

---

**Follow-up I Expect**:

Q: 'When to split component into smaller components?'
A: **Signals**: (1) **Component >200 lines** (hard to understand), (2) **Multiple responsibilities** (e.g., fetch data + display + handle events), (3) **Reusable part** (e.g., button logic reused elsewhere), (4) **Performance** (expensive part re-renders unnecessarily). **Example**: `<Dashboard>` (300 lines) → split into `<Sidebar>` + `<Main>` + `<StatCard>` (easier to test, reuse `<StatCard>`).

Q: 'Presentational vs Container components?'
A: **Presentational**: Display UI, pure function of props, no state/side effects, highly reusable (e.g., `<Card>`, `<Button>`). **Container**: Manage data/business logic, fetch data, handle events, delegates presentation to presentational components (e.g., `<ProductList>` fetches products, renders `<ProductCard>`s). **Benefits**: Separation of concerns (data logic vs UI), easier to test (presentational pure, container mock API), reusability (presentational works in any context).

Q: 'How to avoid prop drilling?'
A: **Context**: Skip intermediate components (`<UserContext.Provider>` → `useContext` in deeply nested component). **Global State**: Redux/Zustand for cross-cutting concerns (e.g., auth, cart). **Component Composition**: Pass components as props (`<Layout sidebar={<Sidebar />}>` → no need to pass data through Layout). **Trade-off**: Context = tight coupling (components depend on context, less reusable), global state = complexity (boilerplate, learning curve)."

---

## 5. Code Examples

See Deep-Dive section for comprehensive code examples covering:
- Presentational vs Container components
- Component communication (props, events, context, global state)
- Performance optimization (React.memo, useMemo, useCallback)
- Component patterns (compound components, controlled/uncontrolled)
- Testing strategies (unit, integration)

---

## 6. Why & How Summary

### Why It Matters

**Modularity**: Break complex UIs into manageable pieces (small focused components easier to understand maintain, clear boundaries single responsibility)  
**Reusability**: Components work in different contexts (DRY principle same Button/Card/Modal across app, design systems shared libraries Polaris)  
**Maintainability**: Changes localized to component (no ripple effects, update Button styles all instances updated single source of truth)  
**Testability**: Isolated components (unit tests, presentational pure functions easy to test, container mock API dependencies)  
**Parallel Development**: Teams work on different components (no blocking, Team A Header Team B Dashboard independent)  
**Scalability**: Handle large codebases (50-500 components medium app, 1000+ large app, component hierarchy 5 levels typical)

### How It Works

**Component Definition**: Self-contained UI unit with props (inputs from parent), state (internal data), logic (event handlers effects), template (JSX/HTML rendering), styles (CSS/CSS-in-JS)  
**Component Types**: Presentational (display UI no business logic pure function props highly reusable Card Button), Container (manage data business logic side effects fetch data handle events ProductList), Layout (structure positioning Grid Sidebar Main), HOC/Custom Hooks (reuse logic withLoading useFetch)  
**Communication**: Props down (parent passes data to child), events up (child emits events to parent via callback props), context (skip intermediate components avoid prop drilling), global state (Redux/Zustand share across unrelated components)  
**Lifecycle**: Mount (component created added to DOM useEffect runs), Update (props/state change re-render useEffect with dependencies), Unmount (component removed cleanup return from useEffect)  
**Performance**: Avoid unnecessary re-renders (React.memo skip if props unchanged parent re-renders child skips), expensive calculations (useMemo cache result only recalculate if dependencies change filter 10,000 items), recreating functions (useCallback stable reference breaks React.memo), large trees (code splitting React.lazy load on demand, virtualization react-window render only visible items, lazy loading Suspense)  
**Patterns**: Compound components (related components work together Tabs + Tab implicit context), controlled (React owns state input value onChange) vs uncontrolled (DOM owns state useRef), composition (complex UIs from simple components Dashboard = Sidebar + Main + StatCard)

**FAANG Expectation**: Define component-based architecture (reusable self-contained components encapsulated logic state styles composition modularity), component types (presentational pure display no logic highly reusable, container data logic side effects delegates presentation, layout structure, HOC/hooks reuse logic), communication patterns (props down events up context skip intermediate global state cross-cutting), performance optimization (React.memo skip re-renders, useMemo cache calculations, useCallback stable functions, code splitting virtualization lazy loading), benefits (modularity small focused, reusability DRY, testability isolated, parallel development teams independent, maintainability changes localized), trade-offs (over-componentization too many small components hard to navigate, prop drilling verbose solution context/global state, tight coupling less reusable solution keep generic), real-world examples (Airbnb ListingCard reusable teams parallel, Twitter Tweet memoized virtualized feed, Shopify Polaris design system shared library consistent UI), when to split (>200 lines multiple responsibilities reusable part performance expensive re-renders), presentational vs container (display vs data logic separation of concerns easier to test)
