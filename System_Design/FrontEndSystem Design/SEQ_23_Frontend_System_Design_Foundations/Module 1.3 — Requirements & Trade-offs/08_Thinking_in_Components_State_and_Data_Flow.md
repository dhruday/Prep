# Thinking in Components, State, and Data Flow

## 1. High-Level Explanation (Frontend Interview Level)

**"Thinking in Components, State, and Data Flow"** is the fundamental mental model for designing frontend systems. It's how senior engineers decompose complex UIs into manageable, maintainable pieces.

### The Three Pillars

```
COMPONENTS (Structure)
└─ How do we break down the UI?

STATE (Data)
└─ What data drives the UI?

DATA FLOW (Communication)
└─ How does data move through the system?
```

### Why This Matters in Interviews

**Mid-Level Engineer:**
```
"I'll build a dashboard with React components"
```
→ Vague, no structure

**Senior/Staff Engineer:**
```
"I'll decompose the dashboard into:

COMPONENTS:
- Layout components (Header, Sidebar, Main)
- Feature components (ChartWidget, MetricsPanel)
- Shared components (Button, Card, LoadingSpinner)

STATE:
- Server state (metrics data from API)
- Client state (filters, date range, selected chart type)
- UI state (loading, errors, modal visibility)

DATA FLOW:
- API → React Query → Components (server data)
- User action → Zustand → Components (client state)
- Parent → Props → Child (component communication)
```
→ Clear structure, shows understanding

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Pillar 1: Thinking in Components

#### Component Hierarchy Framework

```
COMPONENT TYPES BY PURPOSE
├─ Layout Components (structure)
│  ├─ AppShell (root layout)
│  ├─ Header, Sidebar, Footer
│  └─ Grid, Stack, Flex (primitives)
│
├─ Feature Components (business logic)
│  ├─ ProductList
│  ├─ ShoppingCart
│  ├─ CheckoutForm
│  └─ UserProfile
│
├─ Shared/Common Components (reusable)
│  ├─ Button, Input, Select
│  ├─ Card, Modal, Tooltip
│  └─ Table, List, Grid
│
├─ Domain Components (specific logic)
│  ├─ ProductCard (e-commerce specific)
│  ├─ InvoiceTemplate (billing specific)
│  └─ ChatMessage (messaging specific)
│
└─ Utility Components (helpers)
   ├─ ErrorBoundary
   ├─ LoadingSpinner
   ├─ PrivateRoute
   └─ InfiniteScroll
```

#### Component Composition Patterns

**Pattern 1: Container/Presenter (Smart/Dumb)**

```typescript
// Container: Handles data fetching and logic
function ProductListContainer() {
  const { data: products, isLoading } = useQuery('products', fetchProducts);
  const [filters, setFilters] = useState({ category: 'all' });
  
  const filteredProducts = useMemo(() => {
    return products?.filter(p => 
      filters.category === 'all' || p.category === filters.category
    );
  }, [products, filters]);
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <ProductListPresenter
      products={filteredProducts}
      filters={filters}
      onFilterChange={setFilters}
    />
  );
}

// Presenter: Pure UI, no business logic
interface ProductListPresenterProps {
  products: Product[];
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

function ProductListPresenter({ 
  products, 
  filters, 
  onFilterChange 
}: ProductListPresenterProps) {
  return (
    <div className="product-list">
      <FilterBar filters={filters} onChange={onFilterChange} />
      
      <div className="product-grid">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

**Benefits:**
- ✅ Easy to test (presenter is pure function)
- ✅ Reusable presenter (different data sources)
- ✅ Clear separation of concerns

**When to use:**
- Complex components with business logic
- Need to test UI independently
- Want to reuse UI with different data

---

**Pattern 2: Compound Components**

```typescript
// Parent component provides context
function Tabs({ children }) {
  const [activeTab, setActiveTab] = useState(0);
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// Child components use context
function TabList({ children }) {
  return <div className="tab-list" role="tablist">{children}</div>;
}

function Tab({ index, children }) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === index;
  
  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(index)}
      className={cn('tab', isActive && 'tab-active')}
    >
      {children}
    </button>
  );
}

function TabPanels({ children }) {
  return <div className="tab-panels">{children}</div>;
}

function TabPanel({ index, children }) {
  const { activeTab } = useTabsContext();
  
  if (activeTab !== index) return null;
  
  return (
    <div role="tabpanel" className="tab-panel">
      {children}
    </div>
  );
}

// Usage: Flexible, composable API
function App() {
  return (
    <Tabs>
      <TabList>
        <Tab index={0}>Profile</Tab>
        <Tab index={1}>Settings</Tab>
        <Tab index={2}>Billing</Tab>
      </TabList>
      
      <TabPanels>
        <TabPanel index={0}><ProfileContent /></TabPanel>
        <TabPanel index={1}><SettingsContent /></TabPanel>
        <TabPanel index={2}><BillingContent /></TabPanel>
      </TabPanels>
    </Tabs>
  );
}
```

**Benefits:**
- ✅ Flexible API (compose as needed)
- ✅ Implicit state sharing (context)
- ✅ Great developer experience

**When to use:**
- Complex UI patterns (tabs, accordions, menus)
- Need flexible composition
- Building design systems

---

**Pattern 3: Render Props / Children as Function**

```typescript
// Generic data fetching component
function DataFetcher<T>({ 
  url, 
  children 
}: { 
  url: string; 
  children: (data: FetchState<T>) => ReactNode;
}) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  
  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(data => setState({ data, loading: false, error: null }))
      .catch(error => setState({ data: null, loading: false, error }));
  }, [url]);
  
  return <>{children(state)}</>;
}

// Usage: Consumer decides how to render
function UserProfile() {
  return (
    <DataFetcher<User> url="/api/user">
      {({ data, loading, error }) => {
        if (loading) return <Skeleton />;
        if (error) return <ErrorMessage error={error} />;
        if (!data) return null;
        
        return (
          <div className="profile">
            <Avatar src={data.avatar} />
            <h1>{data.name}</h1>
            <p>{data.bio}</p>
          </div>
        );
      }}
    </DataFetcher>
  );
}
```

**Benefits:**
- ✅ Maximum flexibility (consumer controls rendering)
- ✅ Reusable logic (fetching abstracted)
- ✅ Type-safe (generic)

**When to use:**
- Need to share logic, not UI
- Multiple rendering variations
- Building utility components

---

### Pillar 2: Thinking in State

#### State Categorization Framework

```
STATE TYPES
├─ Server State (from API)
│  ├─ User data
│  ├─ Product listings
│  ├─ Comments, posts
│  └─ Characteristics:
│     ├─ Persisted remotely
│     ├─ Async loading
│     ├─ Can become stale
│     └─ Needs caching
│
├─ Client State (app-specific)
│  ├─ Form inputs
│  ├─ Filters, sorting
│  ├─ Selected items
│  └─ Characteristics:
│     ├─ Ephemeral (session-only)
│     ├─ Synchronous
│     ├─ Always fresh
│     └─ No caching needed
│
├─ UI State (interface)
│  ├─ Modal visibility
│  ├─ Dropdown open/closed
│  ├─ Loading indicators
│  ├─ Toast notifications
│  └─ Characteristics:
│     ├─ Temporary
│     ├─ Doesn't persist
│     ├─ Component-scoped
│     └─ Driven by interactions
│
├─ URL State (shareable)
│  ├─ Page number
│  ├─ Search query
│  ├─ Filters
│  └─ Characteristics:
│     ├─ Shareable (via URL)
│     ├─ Bookmarkable
│     ├─ Browser history
│     └─ SEO-friendly
│
└─ Local Storage State (persisted)
   ├─ Theme preference
   ├─ Language
   ├─ Collapsed sidebar
   └─ Characteristics:
      ├─ Survives page refresh
      ├─ Per-device
      ├─ No server sync
      └─ User preferences
```

#### State Management Decision Tree

```typescript
// Decision tree for state management

function decideStatePlacement(state: any) {
  // Question 1: Does it come from API?
  if (isFromAPI(state)) {
    return 'Use React Query / SWR / RTK Query';
  }
  
  // Question 2: Is it in URL? (shareable/bookmarkable?)
  if (shouldBeInURL(state)) {
    return 'Use URL params / search params';
  }
  
  // Question 3: Is it shared across many components?
  if (isSharedGlobally(state)) {
    // Question 3a: Is it complex with many actions?
    if (isComplexState(state)) {
      return 'Use Redux / Zustand';
    }
    return 'Use React Context';
  }
  
  // Question 4: Is it shared between siblings?
  if (isSharedBetweenSiblings(state)) {
    return 'Lift state to nearest common parent';
  }
  
  // Question 5: Is it only used in one component?
  if (isComponentLocal(state)) {
    return 'Use useState / useReducer';
  }
  
  return 'Default: useState';
}
```

#### State Colocation Principle

**Principle:** Keep state as close as possible to where it's used.

**❌ Anti-pattern: Over-globalization**

```typescript
// Everything in global store (Redux)
// Problem: Cart state doesn't need to be global

interface GlobalState {
  user: User;
  products: Product[];
  cart: Cart;
  theme: Theme;
  modalOpen: boolean;        // ❌ UI state in global store
  searchQuery: string;       // ❌ Could be in URL
  hoveredProduct: string;    // ❌ Temporary UI state
}

// Every component connects to store, even for local state
function ProductCard({ productId }) {
  const hoveredProduct = useSelector(state => state.hoveredProduct);
  const dispatch = useDispatch();
  
  // This causes ALL ProductCards to re-render when ANY one is hovered
  return (
    <div
      onMouseEnter={() => dispatch(setHoveredProduct(productId))}
      onMouseLeave={() => dispatch(setHoveredProduct(null))}
    >
      {/* ... */}
    </div>
  );
}
```

**✅ Better: Colocated State**

```typescript
// Global state: Only truly global data
interface GlobalState {
  user: User;    // Used everywhere (auth, profile, etc.)
  cart: Cart;    // Shared across pages
  theme: Theme;  // App-wide setting
}

// Component state: Keep it local
function ProductCard({ product }) {
  const [isHovered, setIsHovered] = useState(false); // ✅ Local to component
  
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn('product-card', isHovered && 'product-card-hovered')}
    >
      {/* ... */}
    </div>
  );
}

// URL state: Shareable filters
function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || 'all'; // ✅ In URL
  
  return (
    <div>
      <CategoryFilter
        value={category}
        onChange={(cat) => setSearchParams({ category: cat })}
      />
      {/* ... */}
    </div>
  );
}
```

---

### Pillar 3: Thinking in Data Flow

#### Data Flow Patterns

**Pattern 1: Unidirectional Data Flow (React Standard)**

```typescript
// Data flows down (props)
// Events flow up (callbacks)

function ShoppingApp() {
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Data flows DOWN to children via props
  // Events flow UP via callbacks
  
  return (
    <div>
      <ProductList
        onAddToCart={(product) => {
          // Event flows UP from ProductList
          setCart(prev => [...prev, product]);
        }}
      />
      
      <Cart
        items={cart} // Data flows DOWN to Cart
        onRemove={(id) => {
          // Event flows UP from Cart
          setCart(prev => prev.filter(item => item.id !== id));
        }}
      />
    </div>
  );
}

function ProductList({ onAddToCart }) {
  const { data: products } = useProducts();
  
  return (
    <div>
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product} // Data flows DOWN
          onAddToCart={onAddToCart} // Callback passed DOWN, invoked UP
        />
      ))}
    </div>
  );
}

function ProductCard({ product, onAddToCart }) {
  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={() => onAddToCart(product)}>
        Add to Cart {/* Event triggered, flows UP */}
      </button>
    </div>
  );
}
```

**Benefits:**
- ✅ Predictable (always top-down)
- ✅ Easy to debug (trace data path)
- ✅ Testable (pass props, verify behavior)

**Drawback:**
- ❌ Prop drilling (pass through many levels)

---

**Pattern 2: Context for Deep Trees**

```typescript
// Problem: Prop drilling through many levels
function App() {
  const [theme, setTheme] = useState('light');
  
  // ❌ Passing through every level
  return (
    <Layout theme={theme}>
      <Header theme={theme}>
        <Nav theme={theme}>
          <NavItem theme={theme} />
        </Nav>
      </Header>
    </Layout>
  );
}

// Solution: Context for cross-cutting concerns
const ThemeContext = createContext<ThemeContextType | null>(null);

function App() {
  const [theme, setTheme] = useState('light');
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Layout>
        <Header>
          <Nav>
            <NavItem /> {/* Can access theme via useTheme() */}
          </Nav>
        </Header>
      </Layout>
    </ThemeContext.Provider>
  );
}

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

function NavItem() {
  const { theme } = useTheme(); // Access theme directly
  
  return <a className={`nav-item nav-item-${theme}`}>Link</a>;
}
```

**When to use Context:**
- ✅ Theme, locale, auth user (cross-cutting concerns)
- ✅ Data needed by many components at different levels
- ✅ Avoiding prop drilling

**When NOT to use Context:**
- ❌ Frequently changing data (causes re-renders)
- ❌ Data used by only a few components
- ❌ As a replacement for all prop passing

---

**Pattern 3: Event Bus for Loosely Coupled Events**

```typescript
// Pattern: Events that aren't tied to component hierarchy

// Event emitter
class EventBus {
  private listeners: Map<string, Set<Function>> = new Map();
  
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }
  
  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }
  
  emit(event: string, data?: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
}

const eventBus = new EventBus();

// Component A: Emits event
function AddToCartButton({ product }) {
  const handleClick = () => {
    addToCart(product);
    
    // Emit event (anyone can listen)
    eventBus.emit('cart:item-added', { product });
  };
  
  return <button onClick={handleClick}>Add to Cart</button>;
}

// Component B: Listens to event (unrelated component tree)
function Toast() {
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    const handleItemAdded = ({ product }) => {
      setMessage(`${product.name} added to cart`);
      setTimeout(() => setMessage(''), 3000);
    };
    
    eventBus.on('cart:item-added', handleItemAdded);
    
    return () => eventBus.off('cart:item-added', handleItemAdded);
  }, []);
  
  if (!message) return null;
  
  return <div className="toast">{message}</div>;
}

// Component C: Also listens (analytics)
function Analytics() {
  useEffect(() => {
    const trackAddToCart = ({ product }) => {
      analytics.track('Product Added', {
        productId: product.id,
        productName: product.name,
      });
    };
    
    eventBus.on('cart:item-added', trackAddToCart);
    
    return () => eventBus.off('cart:item-added', trackAddToCart);
  }, []);
  
  return null;
}
```

**When to use Event Bus:**
- ✅ Notifications/toasts
- ✅ Analytics tracking
- ✅ Loosely coupled features
- ✅ Cross-component side effects

**When NOT to use:**
- ❌ Primary data flow (use props/context)
- ❌ Parent-child communication
- ❌ State management (use proper state)

---

#### Data Flow Optimization Patterns

**Pattern 1: Memoization to Prevent Unnecessary Re-renders**

```typescript
// Problem: Child re-renders even when its props haven't changed

function Parent() {
  const [count, setCount] = useState(0);
  const [filter, setFilter] = useState('');
  
  // ❌ New function on every render
  const handleFilterChange = (value: string) => {
    setFilter(value);
  };
  
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
      
      {/* Child re-renders even when filter didn't change */}
      <ExpensiveChild
        filter={filter}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}

// Solution: Memoize callbacks and components

function Parent() {
  const [count, setCount] = useState(0);
  const [filter, setFilter] = useState('');
  
  // ✅ Stable function reference
  const handleFilterChange = useCallback((value: string) => {
    setFilter(value);
  }, []);
  
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
      
      {/* Child only re-renders when filter or callback changes */}
      <ExpensiveChild
        filter={filter}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}

// Memoize component
const ExpensiveChild = memo(function ExpensiveChild({ 
  filter, 
  onFilterChange 
}: ExpensiveChildProps) {
  // Expensive rendering logic
  const filteredData = useMemo(() => {
    return expensiveFilterOperation(data, filter);
  }, [data, filter]);
  
  return <div>{/* render filteredData */}</div>;
});
```

**When to memoize:**
- ✅ Expensive computations
- ✅ Large lists
- ✅ Components that re-render frequently
- ✅ Callbacks passed to memoized children

**When NOT to memoize:**
- ❌ Cheap computations (premature optimization)
- ❌ Components that always change
- ❌ Over-memoizing (readability cost)

---

**Pattern 2: Optimistic Updates**

```typescript
// Pattern: Update UI immediately, sync with server later

function useOptimisticTodo() {
  const queryClient = useQueryClient();
  
  const addTodoMutation = useMutation(
    async (newTodo: Todo) => {
      const response = await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify(newTodo),
      });
      return response.json();
    },
    {
      // Before mutation (optimistic update)
      onMutate: async (newTodo) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries(['todos']);
        
        // Snapshot previous value
        const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);
        
        // Optimistically update cache
        queryClient.setQueryData<Todo[]>(['todos'], (old = []) => [
          ...old,
          { ...newTodo, id: `temp-${Date.now()}`, status: 'pending' },
        ]);
        
        // Return context for rollback
        return { previousTodos };
      },
      
      // On success: Replace temp with real
      onSuccess: (data, variables, context) => {
        queryClient.setQueryData<Todo[]>(['todos'], (old = []) =>
          old.map(todo =>
            todo.id.startsWith('temp-') ? data : todo
          )
        );
      },
      
      // On error: Rollback
      onError: (err, variables, context) => {
        queryClient.setQueryData(['todos'], context?.previousTodos);
        toast.error('Failed to add todo');
      },
      
      // Always refetch after mutation
      onSettled: () => {
        queryClient.invalidateQueries(['todos']);
      },
    }
  );
  
  return { addTodo: addTodoMutation.mutate };
}

// Usage: Instant UI feedback
function TodoList() {
  const { data: todos } = useQuery(['todos'], fetchTodos);
  const { addTodo } = useOptimisticTodo();
  
  const handleAdd = (text: string) => {
    addTodo({ text }); // UI updates instantly
  };
  
  return (
    <div>
      {todos?.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          isPending={todo.status === 'pending'} // Show pending state
        />
      ))}
      <AddTodoForm onAdd={handleAdd} />
    </div>
  );
}
```

**Benefits:**
- ✅ Instant UI feedback (feels faster)
- ✅ Better UX (no waiting for server)
- ✅ Automatic rollback on error

**Use cases:**
- Liking/unliking
- Adding to cart
- Toggling todos
- Sending messages

---

## 3. Clear Real-World Examples

### Example 1: Twitter Feed (Complete Breakdown)

#### Component Structure

```
TwitterFeed
├─ FeedContainer (data fetching, state)
│  └─ FeedPresenter (UI rendering)
│     ├─ ComposeBox
│     │  ├─ Avatar
│     │  ├─ TextArea
│     │  └─ ActionButtons
│     ├─ TweetList
│     │  └─ TweetCard (map)
│     │     ├─ TweetHeader
│     │     │  ├─ Avatar
│     │     │  └─ UserInfo
│     │     ├─ TweetContent
│     │     │  ├─ Text
│     │     │  └─ Media (images/video)
│     │     └─ TweetActions
│     │        ├─ LikeButton
│     │        ├─ RetweetButton
│     │        ├─ ReplyButton
│     │        └─ ShareButton
│     └─ LoadMoreButton
└─ TrendingSidebar
   ├─ TrendingTopics
   └─ WhoToFollow
```

#### State Management

```typescript
// Server State (React Query)
function useFeed() {
  return useInfiniteQuery(
    ['feed'],
    ({ pageParam = 0 }) => fetchTweets(pageParam),
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 60000, // Fresh for 1 minute
    }
  );
}

function useTweet(tweetId: string) {
  return useQuery(['tweet', tweetId], () => fetchTweet(tweetId));
}

// Client State (Zustand)
interface ComposerStore {
  text: string;
  setText: (text: string) => void;
  isComposing: boolean;
  setIsComposing: (value: boolean) => void;
}

const useComposerStore = create<ComposerStore>((set) => ({
  text: '',
  setText: (text) => set({ text }),
  isComposing: false,
  setIsComposing: (value) => set({ isComposing: value }),
}));

// UI State (Component local)
function TweetCard({ tweet }) {
  const [showOptions, setShowOptions] = useState(false); // Local
  const [isExpanded, setIsExpanded] = useState(false);   // Local
  
  // ...
}

// URL State (Search params)
function Feed() {
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter') || 'latest'; // URL state
  
  // ...
}
```

#### Data Flow

```typescript
// Unidirectional flow: Top to bottom

function TwitterFeed() {
  // 1. Fetch data at top level
  const { data, fetchNextPage } = useFeed();
  const tweets = data?.pages.flatMap(page => page.tweets) ?? [];
  
  // 2. Pass data down
  return (
    <div className="feed">
      <ComposeBox
        onTweetPosted={(tweet) => {
          // 3. Events flow up
          // Optimistic update
          queryClient.setQueryData(['feed'], (old) => ({
            ...old,
            pages: [
              { tweets: [tweet, ...old.pages[0].tweets] },
              ...old.pages.slice(1),
            ],
          }));
        }}
      />
      
      <TweetList
        tweets={tweets} // Data flows down
        onLike={(tweetId) => {
          // Events flow up
          likeTweet(tweetId);
        }}
      />
      
      <InfiniteScrollTrigger
        onTrigger={fetchNextPage} // Event flows up
      />
    </div>
  );
}

// Child: Data flows in via props
function TweetList({ tweets, onLike }) {
  return (
    <div>
      {tweets.map(tweet => (
        <TweetCard
          key={tweet.id}
          tweet={tweet}           // Data flows down
          onLike={() => onLike(tweet.id)} // Event flows up
        />
      ))}
    </div>
  );
}
```

---

### Example 2: E-commerce Dashboard (Multi-State Types)

#### Component Structure

```
Dashboard
├─ DashboardLayout
│  ├─ Sidebar (navigation)
│  ├─ Header (user, notifications)
│  └─ MainContent
│     ├─ MetricsRow
│     │  ├─ RevenueCard (server state)
│     │  ├─ OrdersCard (server state)
│     │  └─ UsersCard (server state)
│     ├─ SalesChart
│     │  └─ ChartControls (client state)
│     └─ RecentOrders
│        └─ OrderTable (server state)
└─ FilterPanel (URL state)
```

#### State by Type

```typescript
// 1. SERVER STATE (React Query)
// Fetched from API, cached, can become stale

function useMetrics(dateRange: DateRange) {
  return useQuery(
    ['metrics', dateRange],
    () => fetchMetrics(dateRange),
    {
      staleTime: 300000, // 5 minutes
      refetchOnWindowFocus: true,
    }
  );
}

function useRecentOrders() {
  return useQuery(
    ['orders', 'recent'],
    () => fetchRecentOrders(),
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );
}

// 2. URL STATE (Search params)
// Shareable, bookmarkable filters

function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read from URL
  const dateRange = searchParams.get('dateRange') || 'last7days';
  const sortBy = searchParams.get('sortBy') || 'date';
  
  // Update URL
  const setDateRange = (range: string) => {
    setSearchParams({ dateRange: range, sortBy });
  };
  
  // This URL is shareable: /dashboard?dateRange=last30days&sortBy=revenue
}

// 3. CLIENT STATE (Zustand)
// App-specific, not from server

interface DashboardStore {
  selectedMetric: 'revenue' | 'orders' | 'users';
  setSelectedMetric: (metric: string) => void;
  chartType: 'line' | 'bar';
  setChartType: (type: string) => void;
  comparisonEnabled: boolean;
  toggleComparison: () => void;
}

const useDashboardStore = create<DashboardStore>((set) => ({
  selectedMetric: 'revenue',
  setSelectedMetric: (metric) => set({ selectedMetric: metric }),
  chartType: 'line',
  setChartType: (type) => set({ chartType: type }),
  comparisonEnabled: false,
  toggleComparison: () => set((state) => ({
    comparisonEnabled: !state.comparisonEnabled,
  })),
}));

// 4. UI STATE (Component local)
// Temporary, component-scoped

function SalesChart() {
  const [isHovering, setIsHovering] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);
  
  // Local UI state for hover interactions
}

// 5. LOCAL STORAGE STATE (Persisted preferences)

function useDashboardPreferences() {
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('dashboard-preferences');
    return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
  });
  
  const updatePreferences = (newPrefs: Partial<Preferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    localStorage.setItem('dashboard-preferences', JSON.stringify(updated));
  };
  
  return { preferences, updatePreferences };
}
```

#### Complete Implementation

```typescript
function Dashboard() {
  // URL State (shareable filters)
  const [searchParams, setSearchParams] = useSearchParams();
  const dateRange = searchParams.get('dateRange') || 'last7days';
  
  // Server State (from API)
  const { data: metrics, isLoading } = useMetrics(dateRange);
  const { data: orders } = useRecentOrders();
  
  // Client State (UI controls)
  const { chartType, setChartType } = useDashboardStore();
  
  // Local Storage (user preferences)
  const { preferences } = useDashboardPreferences();
  
  if (isLoading) return <DashboardSkeleton />;
  
  return (
    <DashboardLayout theme={preferences.theme}>
      {/* Filter Panel: Updates URL state */}
      <FilterPanel
        dateRange={dateRange}
        onDateRangeChange={(range) => setSearchParams({ dateRange: range })}
      />
      
      {/* Metrics: Server state */}
      <MetricsRow>
        <RevenueCard value={metrics.revenue} />
        <OrdersCard value={metrics.orders} />
        <UsersCard value={metrics.users} />
      </MetricsRow>
      
      {/* Chart: Server state + Client state */}
      <SalesChart
        data={metrics.chartData}
        type={chartType}
        onTypeChange={setChartType}
      />
      
      {/* Table: Server state */}
      <RecentOrders orders={orders} />
    </DashboardLayout>
  );
}
```

**Key Insights:**

1. **URL State** = Shareable (date range, filters)
2. **Server State** = From API (metrics, orders)
3. **Client State** = UI controls (chart type, selected metric)
4. **Local Storage** = Preferences (theme, collapsed sidebar)
5. **Component State** = Temporary UI (hover, tooltip)

Each type of state uses the appropriate tool:
- URL → `useSearchParams`
- Server → React Query
- Client (global) → Zustand
- Client (local) → `useState`
- Persisted → localStorage + `useState`

---

### Example 3: Notion-like Editor (Complex State & Data Flow)

#### Component Structure

```
Editor
├─ EditorContainer (orchestrates)
│  ├─ Toolbar (actions)
│  ├─ BlockList (content)
│  │  └─ Block (map)
│  │     ├─ TextBlock
│  │     ├─ HeadingBlock
│  │     ├─ ImageBlock
│  │     ├─ CodeBlock
│  │     └─ TableBlock
│  └─ CollaboratorCursors
└─ Sidebar (outline, comments)
```

#### State Management (Complex)

```typescript
// 1. Document State (Server + Real-time)
function useDocument(documentId: string) {
  // Initial fetch
  const { data: initialDoc } = useQuery(
    ['document', documentId],
    () => fetchDocument(documentId)
  );
  
  // Real-time updates via WebSocket
  const [blocks, setBlocks] = useState(initialDoc?.blocks || []);
  
  useEffect(() => {
    const ws = new WebSocket(`wss://api.example.com/doc/${documentId}`);
    
    ws.onmessage = (event) => {
      const { type, operation } = JSON.parse(event.data);
      
      if (type === 'block-updated') {
        setBlocks(prev => applyOperation(prev, operation));
      }
    };
    
    return () => ws.close();
  }, [documentId]);
  
  return { blocks, setBlocks };
}

// 2. Editor State (Client)
interface EditorStore {
  focusedBlockId: string | null;
  selectedBlockIds: string[];
  clipboard: Block[];
  // ... other editor state
}

const useEditorStore = create<EditorStore>((set) => ({
  focusedBlockId: null,
  selectedBlockIds: [],
  clipboard: [],
  // ... actions
}));

// 3. Collaboration State (Real-time)
interface CollaboratorCursor {
  userId: string;
  userName: string;
  blockId: string;
  position: number;
  color: string;
}

function useCollaborators(documentId: string) {
  const [cursors, setCursors] = useState<CollaboratorCursor[]>([]);
  
  // WebSocket for cursor positions
  useEffect(() => {
    const ws = new WebSocket(`wss://api.example.com/collab/${documentId}`);
    
    ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      
      if (type === 'cursor-move') {
        setCursors(prev => updateCursor(prev, data));
      }
    };
    
    return () => ws.close();
  }, [documentId]);
  
  return { cursors };
}
```

#### Data Flow (Bidirectional with Collaboration)

```typescript
function Editor({ documentId }) {
  // Document state (server + real-time)
  const { blocks, setBlocks } = useDocument(documentId);
  
  // Editor state (client)
  const { focusedBlockId, setFocusedBlock } = useEditorStore();
  
  // Collaboration (real-time)
  const { cursors } = useCollaborators(documentId);
  
  // Handle local edits
  const handleBlockChange = useCallback((blockId: string, content: string) => {
    // 1. Update local state immediately (optimistic)
    setBlocks(prev =>
      prev.map(block =>
        block.id === blockId ? { ...block, content } : block
      )
    );
    
    // 2. Send to server via WebSocket
    ws.send(JSON.stringify({
      type: 'block-update',
      blockId,
      content,
      userId: currentUserId,
    }));
    
    // 3. Broadcast cursor position
    ws.send(JSON.stringify({
      type: 'cursor-move',
      blockId,
      position: getCursorPosition(),
      userId: currentUserId,
    }));
  }, []);
  
  // Handle remote edits
  // (Already handled in useDocument via WebSocket)
  
  return (
    <div className="editor">
      <Toolbar />
      
      <BlockList>
        {blocks.map(block => (
          <Block
            key={block.id}
            block={block}
            isFocused={block.id === focusedBlockId}
            onChange={(content) => handleBlockChange(block.id, content)}
            onFocus={() => setFocusedBlock(block.id)}
          />
        ))}
      </BlockList>
      
      {/* Show other users' cursors */}
      {cursors.map(cursor => (
        <CollaboratorCursor key={cursor.userId} cursor={cursor} />
      ))}
    </div>
  );
}
```

**Data Flow Patterns:**

1. **Local Edit:**
   - User types → Update local state (instant)
   - Send to server via WebSocket
   - Server broadcasts to other clients
   - Other clients update their local state

2. **Remote Edit:**
   - Server sends update via WebSocket
   - Apply operational transform (conflict resolution)
   - Update local state
   - Re-render affected blocks only

3. **Cursor Position:**
   - Local cursor moves → Broadcast position
   - Receive others' positions → Render cursors

---

## 4. Interview-Oriented Explanation

### Sample Interview Answer (7+ Years Experience)

**Question:** "How do you approach component and state design for a complex feature?"

**Your Answer:**

> "I use a three-step framework: Components, State, Data Flow.
>
> **Step 1: Component Structure (5 minutes)**
>
> I start by sketching the component tree:
>
> ```
> Feature
> ├─ Container (smart)
> │  └─ Presenter (dumb)
> │     ├─ SubFeatureA
> │     └─ SubFeatureB
> └─ SharedComponents
> ```
>
> I ask myself:
> - What's the hierarchy?
> - What's reusable?
> - What has business logic vs pure UI?
>
> Example: For a product search page:
> ```
> SearchPage (container)
> └─ SearchPresenter
>    ├─ SearchBar (input, filters)
>    ├─ SearchResults (list)
>    │  └─ ProductCard (map)
>    └─ Pagination
> ```
>
> **Step 2: State Management (5 minutes)**
>
> I categorize state:
>
> 1. **Server State** (API data)
>    - Products list → React Query
>    - User profile → React Query
>
> 2. **URL State** (shareable)
>    - Search query → URL params
>    - Filters → URL params
>    - Page number → URL params
>
> 3. **Client State** (app-specific)
>    - Selected products → Zustand
>    - Comparison mode → Zustand
>
> 4. **UI State** (temporary)
>    - Dropdown open → useState (local)
>    - Hover state → useState (local)
>
> I use this decision tree:
> - From API? → React Query
> - Shareable? → URL
> - Global? → Zustand/Context
> - Local? → useState
>
> **Step 3: Data Flow (5 minutes)**
>
> I establish flow patterns:
>
> 1. **Unidirectional (default)**
>    ```
>    Parent (data) → Child (props)
>    Child (event) → Parent (callback)
>    ```
>
> 2. **Context (cross-cutting)**
>    ```
>    ThemeProvider → useTheme() (anywhere)
>    ```
>
> 3. **Optimistic Updates (UX)**
>    ```
>    User action → Update UI immediately
>    → Send to server → Rollback on error
>    ```
>
> **Real Example from My Experience:**
>
> At [Company], I designed a analytics dashboard:
>
> **Components:**
> ```
> Dashboard
> ├─ MetricsContainer (fetches data)
> │  └─ MetricsGrid (renders)
> │     ├─ MetricCard × 4
> │     └─ TrendChart
> └─ FilterPanel
> ```
>
> **State:**
> - Server: Metrics data (React Query, 5min cache)
> - URL: Date range, metric type (shareable with team)
> - Client: Chart type (bar/line), comparison mode
> - UI: Tooltip data (hover), loading states
>
> **Data Flow:**
> - URL changes → Trigger new API call
> - API data → React Query cache → Components
> - User toggles chart type → Update Zustand → Re-render chart
> - Hover → Local setState → Show tooltip
>
> **Key Decisions:**
>
> 1. **URL for filters** (team can share dashboard views)
> 2. **React Query for API** (automatic caching, no manual refresh logic)
> 3. **Zustand for UI controls** (simpler than Redux, no boilerplate)
> 4. **Local state for hovers** (no need to globalize)
>
> **Outcome:**
> - 40% less code (vs Redux for everything)
> - Shareable URLs (adoption increased)
> - Fast (aggressive caching)
> - Maintainable (clear separation)
>
> **Key Insight:**
> Senior engineers don't just write components. They design systems with clear boundaries, appropriate state placement, and predictable data flow. This makes code maintainable as teams grow."

---

### Interview Red Flags

#### Red Flag 1: No Component Structure

```
❌ Bad:

Interviewer: "Design a dashboard"

Candidate: "I'll use React components"

Interviewer: "Which components?"

Candidate: "Uh... a Dashboard component?"
```

```
✅ Good:

"I'll break it down into:

Layout:
- DashboardLayout (grid/flex structure)
- Sidebar (nav)
- Header (user, notifications)

Features:
- MetricsPanel (revenue, orders, users)
- SalesChart (line/bar chart)
- RecentOrders (table)

Shared:
- Card (wrapper)
- Skeleton (loading)
- EmptyState (no data)

This gives us reusable components and clear responsibilities"
```

---

#### Red Flag 2: Unclear State Management

```
❌ Bad:

Interviewer: "Where do you store the filter state?"

Candidate: "In state"

Interviewer: "Local or global?"

Candidate: "Um... global I guess?"

Interviewer: "Why global?"

Candidate: "Because it's used in multiple places?"
```

```
✅ Good:

"I'd store filters in URL search params because:

1. Shareable (users can send dashboard links)
2. Bookmarkable (save filtered views)
3. Browser history (back button works)
4. SEO-friendly (if public dashboards)

Example:
/dashboard?dateRange=last30days&metric=revenue&sortBy=date

Alternative considered:
- Global state (Zustand): Would work, but not shareable
- Local state: Wouldn't persist across navigation

URL state is the best choice for this use case"
```

---

#### Red Flag 3: Props Drilling Without Solution

```
❌ Bad:

Interviewer: "How do you pass theme down to all components?"

Candidate: "Pass it through props"

Interviewer: "Through 10 levels?"

Candidate: "Yeah, that's how React works"
```

```
✅ Good:

"For cross-cutting concerns like theme, I'd use Context:

```typescript
const ThemeContext = createContext();

function App() {
  const [theme, setTheme] = useState('light');
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Layout>
        {/* No need to pass theme through every level */}
      </Layout>
    </ThemeContext.Provider>
  );
}

function Button() {
  const { theme } = useContext(ThemeContext);
  return <button className={`btn-${theme}`} />;
}
```

Context is appropriate here because:
- Theme is needed by many components
- Theme changes infrequently (no performance issue)
- Avoids prop drilling

For frequently changing data, I'd consider other solutions (Zustand, Redux)"
```

---

## 5. Code Examples

### Complete Feature: Shopping Cart

**Requirements:**
- Add/remove items
- Update quantities
- Persist cart
- Show total price
- Optimistic updates

#### Component Structure

```typescript
// Component Tree
/*
Cart
├─ CartContainer (smart)
│  └─ CartPresenter (dumb)
│     ├─ CartHeader
│     ├─ CartItemList
│     │  └─ CartItem (map)
│     │     ├─ ProductImage
│     │     ├─ ProductInfo
│     │     ├─ QuantityControl
│     │     └─ RemoveButton
│     └─ CartSummary
│        ├─ Subtotal
│        ├─ Tax
│        ├─ Total
│        └─ CheckoutButton
*/

// 1. Container: Handles data and logic
function CartContainer() {
  const { cart, addItem, removeItem, updateQuantity, isLoading } = useCart();
  
  if (isLoading) return <CartSkeleton />;
  
  return (
    <CartPresenter
      items={cart.items}
      subtotal={cart.subtotal}
      tax={cart.tax}
      total={cart.total}
      onAddItem={addItem}
      onRemoveItem={removeItem}
      onUpdateQuantity={updateQuantity}
    />
  );
}

// 2. Presenter: Pure UI
interface CartPresenterProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  onAddItem: (item: CartItem) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
}

function CartPresenter({
  items,
  subtotal,
  tax,
  total,
  onAddItem,
  onRemoveItem,
  onUpdateQuantity,
}: CartPresenterProps) {
  if (items.length === 0) {
    return <EmptyCart />;
  }
  
  return (
    <div className="cart">
      <CartHeader itemCount={items.length} />
      
      <CartItemList>
        {items.map(item => (
          <CartItem
            key={item.id}
            item={item}
            onRemove={() => onRemoveItem(item.id)}
            onUpdateQuantity={(qty) => onUpdateQuantity(item.id, qty)}
          />
        ))}
      </CartItemList>
      
      <CartSummary
        subtotal={subtotal}
        tax={tax}
        total={total}
      />
    </div>
  );
}

// 3. Child components
function CartItem({ item, onRemove, onUpdateQuantity }) {
  return (
    <div className="cart-item">
      <ProductImage src={item.image} alt={item.name} />
      
      <ProductInfo
        name={item.name}
        price={item.price}
      />
      
      <QuantityControl
        quantity={item.quantity}
        onChange={onUpdateQuantity}
      />
      
      <RemoveButton onClick={onRemove} />
    </div>
  );
}

function QuantityControl({ quantity, onChange }) {
  return (
    <div className="quantity-control">
      <button
        onClick={() => onChange(Math.max(1, quantity - 1))}
        aria-label="Decrease quantity"
      >
        -
      </button>
      
      <input
        type="number"
        value={quantity}
        onChange={(e) => onChange(parseInt(e.target.value) || 1)}
        min={1}
        max={99}
      />
      
      <button
        onClick={() => onChange(quantity + 1)}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
```

#### State Management

```typescript
// State Type: Server State (persisted to API)
// Tool: React Query with optimistic updates

interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

function useCart() {
  const queryClient = useQueryClient();
  
  // Fetch cart
  const { data: cart, isLoading } = useQuery(
    ['cart'],
    fetchCart,
    {
      staleTime: 60000, // Fresh for 1 minute
      initialData: () => {
        // Persist to localStorage
        const cached = localStorage.getItem('cart');
        return cached ? JSON.parse(cached) : DEFAULT_CART;
      },
    }
  );
  
  // Add item mutation
  const addItemMutation = useMutation(
    async (item: CartItem) => {
      return await api.post('/cart/items', item);
    },
    {
      // Optimistic update
      onMutate: async (newItem) => {
        await queryClient.cancelQueries(['cart']);
        const previousCart = queryClient.getQueryData<Cart>(['cart']);
        
        // Update cache optimistically
        queryClient.setQueryData<Cart>(['cart'], (old) => {
          if (!old) return old;
          
          const existingItem = old.items.find(i => i.productId === newItem.productId);
          
          let newItems;
          if (existingItem) {
            // Increment quantity
            newItems = old.items.map(i =>
              i.productId === newItem.productId
                ? { ...i, quantity: i.quantity + 1 }
                : i
            );
          } else {
            // Add new item
            newItems = [...old.items, { ...newItem, quantity: 1 }];
          }
          
          // Recalculate totals
          const subtotal = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
          const tax = subtotal * 0.1;
          const total = subtotal + tax;
          
          return { items: newItems, subtotal, tax, total };
        });
        
        // Persist to localStorage
        const updatedCart = queryClient.getQueryData(['cart']);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        
        return { previousCart };
      },
      
      // Rollback on error
      onError: (err, variables, context) => {
        queryClient.setQueryData(['cart'], context?.previousCart);
        toast.error('Failed to add item to cart');
      },
      
      // Sync with server
      onSettled: () => {
        queryClient.invalidateQueries(['cart']);
      },
    }
  );
  
  // Remove item mutation
  const removeItemMutation = useMutation(
    async (itemId: string) => {
      return await api.delete(`/cart/items/${itemId}`);
    },
    {
      onMutate: async (itemId) => {
        await queryClient.cancelQueries(['cart']);
        const previousCart = queryClient.getQueryData<Cart>(['cart']);
        
        queryClient.setQueryData<Cart>(['cart'], (old) => {
          if (!old) return old;
          
          const newItems = old.items.filter(i => i.id !== itemId);
          const subtotal = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
          const tax = subtotal * 0.1;
          const total = subtotal + tax;
          
          return { items: newItems, subtotal, tax, total };
        });
        
        return { previousCart };
      },
      onError: (err, variables, context) => {
        queryClient.setQueryData(['cart'], context?.previousCart);
        toast.error('Failed to remove item');
      },
    }
  );
  
  // Update quantity mutation
  const updateQuantityMutation = useMutation(
    async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      return await api.put(`/cart/items/${itemId}`, { quantity });
    },
    {
      onMutate: async ({ itemId, quantity }) => {
        await queryClient.cancelQueries(['cart']);
        const previousCart = queryClient.getQueryData<Cart>(['cart']);
        
        queryClient.setQueryData<Cart>(['cart'], (old) => {
          if (!old) return old;
          
          const newItems = old.items.map(i =>
            i.id === itemId ? { ...i, quantity } : i
          );
          const subtotal = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
          const tax = subtotal * 0.1;
          const total = subtotal + tax;
          
          return { items: newItems, subtotal, tax, total };
        });
        
        return { previousCart };
      },
      onError: (err, variables, context) => {
        queryClient.setQueryData(['cart'], context?.previousCart);
      },
    }
  );
  
  return {
    cart,
    isLoading,
    addItem: addItemMutation.mutate,
    removeItem: removeItemMutation.mutate,
    updateQuantity: updateQuantityMutation.mutate,
  };
}
```

#### Data Flow

```typescript
// Unidirectional flow with optimistic updates

/*
USER ACTION (Add to cart)
    ↓
OPTIMISTIC UPDATE (Immediate UI update)
    ↓
API CALL (Background sync)
    ↓
SUCCESS: Keep optimistic update
ERROR: Rollback + show error
    ↓
INVALIDATE QUERY (Refetch from server)
    ↓
UI RE-RENDERS (With server data)
*/

// Example flow:
function ProductCard({ product }) {
  const { addItem } = useCart();
  
  const handleAddToCart = () => {
    // 1. User clicks button
    addItem({
      id: generateId(),
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });
    
    // 2. UI updates immediately (optimistic)
    // 3. API call happens in background
    // 4. Success: UI stays as is
    //    Error: Rollback + show toast
  };
  
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
}
```

---

## 6. Why & How Summary

### Why This Mental Model Matters

**In Interviews:**
- Shows systematic thinking (not random code)
- Demonstrates understanding of architecture
- Proves ability to scale (clear structure)
- Separates senior from mid-level

**In Production:**
- Maintainable (clear boundaries)
- Scalable (add features without rewrite)
- Testable (isolated components, pure functions)
- Debuggable (predictable data flow)

### How to Apply This Framework

**Step 1: Components First (5 minutes)**
- Sketch component tree
- Identify reusable parts
- Separate smart vs dumb

**Step 2: Categorize State (5 minutes)**
- Server state? → React Query
- URL state? → Search params
- Global client? → Zustand/Context
- Local? → useState

**Step 3: Map Data Flow (5 minutes)**
- Unidirectional by default
- Context for cross-cutting
- Optimistic for mutations

**Step 4: Implement & Iterate**
- Start simple (useState)
- Refactor when needed (lift state, add context)
- Optimize selectively (memoization)

### Quick Reference Card

**Component Patterns:**
- Container/Presenter → Complex features
- Compound Components → Flexible APIs
- Render Props → Reusable logic

**State Tools:**
- React Query → Server state
- Zustand → Client state (global)
- URL → Shareable state
- useState → Local state

**Data Flow:**
- Props → Down
- Callbacks → Up
- Context → Cross-tree
- Event Bus → Loosely coupled

**Optimizations:**
- useMemo → Expensive computations
- useCallback → Stable references
- memo → Prevent re-renders
- Virtual scrolling → Large lists

---

**🎉 Part 1 Complete! You now have a solid foundation in Frontend System Design fundamentals. Ready for Part 2: Browser & Web Platform Internals?**

