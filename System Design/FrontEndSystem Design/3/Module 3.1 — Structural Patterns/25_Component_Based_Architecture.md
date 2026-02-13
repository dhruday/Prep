# Component-Based Architecture

## 1. High-Level Explanation (Frontend Interview Level)

**Component-Based Architecture** is a software design approach where the user interface is built from independent, reusable, self-contained units called **components**. Each component encapsulates its own structure (HTML), styling (CSS), behavior (JavaScript), and state, making it a complete, modular building block.

### The Big Picture

```
COMPONENT-BASED ARCHITECTURE
────────────────────────────

Traditional Web (Pre-2010s):
┌─────────────────────────────────┐
│  Monolithic HTML + CSS + JS     │
│  - One large HTML file          │
│  - Global CSS                   │
│  - jQuery DOM manipulation      │
│  - No encapsulation             │
└─────────────────────────────────┘
❌ Hard to maintain
❌ Code duplication
❌ Tight coupling
❌ No reusability


Component-Based (Modern):
┌─────────────────────────────────┐
│         Application             │
├─────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐       │
│  │Header   │ │Sidebar  │       │
│  │Component│ │Component│       │
│  └─────────┘ └─────────┘       │
│  ┌─────────────────────────┐   │
│  │   Main Content          │   │
│  │  ┌──────┐  ┌──────┐    │   │
│  │  │Card  │  │Card  │    │   │
│  │  └──────┘  └──────┘    │   │
│  └─────────────────────────┘   │
│  ┌─────────┐                   │
│  │Footer   │                   │
│  └─────────┘                   │
└─────────────────────────────────┘
✅ Modular
✅ Reusable
✅ Testable
✅ Maintainable
```

---

### Core Principles

#### 1. **Encapsulation**
```jsx
// Component owns its structure, style, and behavior
function Button({ onClick, children }) {
  return (
    <button 
      className="btn" 
      onClick={onClick}
      style={{ padding: '10px 20px', backgroundColor: 'blue' }}
    >
      {children}
    </button>
  );
}

// Everything Button needs is self-contained
// No external dependencies (except props)
```

#### 2. **Reusability**
```jsx
// Use same component in multiple places
<Button onClick={handleSave}>Save</Button>
<Button onClick={handleCancel}>Cancel</Button>
<Button onClick={handleDelete}>Delete</Button>

// Same component, different context
// No code duplication
```

#### 3. **Composition**
```jsx
// Build complex UIs from simple components
function Card({ title, content }) {
  return (
    <div className="card">
      <CardHeader title={title} />
      <CardBody content={content} />
      <CardFooter>
        <Button>Read More</Button>
      </CardFooter>
    </div>
  );
}

// Card composed of: CardHeader + CardBody + CardFooter + Button
// Each is an independent component
```

#### 4. **Single Responsibility**
```jsx
// ❌ BAD: Component does too much
function UserDashboard() {
  // Fetches data
  // Renders profile
  // Renders posts
  // Handles authentication
  // Manages forms
  // ... (500 lines)
}

// ✅ GOOD: Each component has one job
function UserDashboard() {
  return (
    <>
      <UserProfile />      {/* Only renders profile */}
      <UserPosts />        {/* Only renders posts */}
      <UserSettings />     {/* Only renders settings */}
    </>
  );
}
```

---

### Component Hierarchy

```
Application (Root)
│
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── Navigation
│   │   │   ├── NavItem (×5)
│   │   │   └── NavDropdown
│   │   └── UserMenu
│   │       ├── Avatar
│   │       └── Dropdown
│   │           ├── MenuItem (×4)
│   │           └── LogoutButton
│   │
│   ├── Sidebar
│   │   ├── SidebarMenu
│   │   │   └── MenuItem (×10)
│   │   └── SidebarFooter
│   │
│   ├── MainContent
│   │   ├── Dashboard
│   │   │   ├── StatsCard (×4)
│   │   │   ├── Chart
│   │   │   └── RecentActivity
│   │   │       └── ActivityItem (×N)
│   │   │
│   │   ├── ProductList
│   │   │   ├── SearchBar
│   │   │   ├── FilterPanel
│   │   │   └── ProductCard (×N)
│   │   │       ├── ProductImage
│   │   │       ├── ProductTitle
│   │   │       ├── ProductPrice
│   │   │       └── AddToCartButton
│   │   │
│   │   └── ShoppingCart
│   │       ├── CartHeader
│   │       ├── CartItem (×N)
│   │       │   ├── ItemImage
│   │       │   ├── ItemDetails
│   │       │   └── RemoveButton
│   │       └── CartTotal
│   │           └── CheckoutButton
│   │
│   └── Footer
│       ├── FooterLinks
│       ├── SocialMedia
│       └── Copyright

Total: 50+ components
Depth: 5-6 levels
Reused: Many components (Button, Input, Card, etc.)
```

**Key Observation:** Complex UI broken down into manageable pieces, each with clear responsibility.

---

### Component Types

#### 1. **Presentational Components (Dumb/Pure)**
```jsx
// Only receives props, no state or logic
function UserCard({ name, email, avatar }) {
  return (
    <div className="user-card">
      <img src={avatar} alt={name} />
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  );
}

// Characteristics:
// - No useState, no useEffect
// - Pure function (same props → same output)
// - Easy to test
// - Highly reusable
```

#### 2. **Container Components (Smart)**
```jsx
// Manages state and logic, passes data to presentational components
function UserCardContainer({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUser(userId).then(data => {
      setUser(data);
      setLoading(false);
    });
  }, [userId]);
  
  if (loading) return <Spinner />;
  
  return <UserCard {...user} />;
}

// Characteristics:
// - Manages state (useState)
// - Handles side effects (useEffect)
// - Orchestrates data flow
// - Delegates rendering to presentational components
```

#### 3. **Compound Components**
```jsx
// Multiple components work together with shared state
function Tabs({ children }) {
  const [activeTab, setActiveTab] = useState(0);
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}

function TabList({ children }) {
  return <div className="tab-list">{children}</div>;
}

function Tab({ index, children }) {
  const { activeTab, setActiveTab } = useTabsContext();
  return (
    <button 
      className={activeTab === index ? 'active' : ''}
      onClick={() => setActiveTab(index)}
    >
      {children}
    </button>
  );
}

function TabPanel({ index, children }) {
  const { activeTab } = useTabsContext();
  return activeTab === index ? <div>{children}</div> : null;
}

// Usage:
<Tabs>
  <TabList>
    <Tab index={0}>Profile</Tab>
    <Tab index={1}>Settings</Tab>
    <Tab index={2}>Activity</Tab>
  </TabList>
  
  <TabPanel index={0}><ProfileContent /></TabPanel>
  <TabPanel index={1}><SettingsContent /></TabPanel>
  <TabPanel index={2}><ActivityContent /></TabPanel>
</Tabs>

// Characteristics:
// - Multiple components with shared implicit state
// - Flexible composition
// - Expressive API
```

#### 4. **Higher-Order Components (HOCs)**
```jsx
// Function that takes a component and returns enhanced component
function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, user } = useAuth();
    
    if (!isAuthenticated) {
      return <Redirect to="/login" />;
    }
    
    return <Component {...props} user={user} />;
  };
}

// Usage:
const ProtectedDashboard = withAuth(Dashboard);

// Characteristics:
// - Cross-cutting concerns (auth, logging, etc.)
// - Component enhancement
// - Code reuse
```

#### 5. **Render Props Components**
```jsx
// Component that uses function as child
function MouseTracker({ render }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  return render(position);
}

// Usage:
<MouseTracker 
  render={({ x, y }) => (
    <div>Mouse position: {x}, {y}</div>
  )}
/>

// Characteristics:
// - Flexible rendering logic
// - Share stateful logic
// - Inversion of control
```

---

### Why This Matters in Interviews

**Junior Engineer:**
```
"We split UI into components and reuse them"
```
→ Too vague, no architectural depth

**Senior/Staff Engineer:**
```
"Component-Based Architecture is the foundation of modern frontend 
development, enabling modularity, reusability, and maintainability at scale.

**Core Principles:**

1. **Encapsulation:**
   - Each component is self-contained
   - Owns its structure, style, and behavior
   - Clear interface via props
   - Internal implementation hidden

2. **Composition:**
   - Build complex UIs from simple components
   - Components can contain other components
   - Flexible, declarative structure
   - Example: Card = Header + Body + Footer + Buttons

3. **Reusability:**
   - Write once, use anywhere
   - Reduces code duplication
   - Consistent UI/UX
   - Faster feature development

4. **Single Responsibility:**
   - Each component does one thing well
   - Easy to understand, test, and modify
   - Low coupling, high cohesion
   - Follows SOLID principles

**Component Types:**

**Presentational (Dumb):**
- Pure functions
- No state or side effects
- Props in → JSX out
- Example: Button, Card, Avatar

**Container (Smart):**
- Manages state and logic
- Fetches data
- Orchestrates child components
- Example: UserListContainer, DashboardContainer

**Advantages:**

1. **Maintainability:**
   - Isolated changes (fix one component)
   - Clear ownership
   - Easy debugging
   - Self-documenting code

2. **Testability:**
   - Unit test each component independently
   - Mock props/dependencies easily
   - High test coverage achievable
   - Fast test execution

3. **Scalability:**
   - Parallel development (teams work on different components)
   - Code splitting per component
   - Lazy loading
   - Performance optimization per component

4. **Developer Experience:**
   - Fast onboarding (components are self-explanatory)
   - Hot module replacement
   - Component libraries (Storybook)
   - TypeScript integration

**Challenges:**

1. **Over-Abstraction:**
   - Too many small components
   - Props drilling through many levels
   - Hard to trace data flow
   - Premature optimization

2. **Performance:**
   - Unnecessary re-renders
   - Component hierarchy depth
   - Memory overhead (many component instances)
   - Need memoization strategies

3. **Complexity:**
   - State management across components
   - Component communication
   - Shared state handling
   - Learning curve for patterns

**Real-World Impact:**

At [Company], we migrated from jQuery monolith to React component architecture:

**Before:**
- 50K lines of jQuery spaghetti code
- One HTML file per page
- Global CSS (100+ conflicts)
- 2-3 days to add feature
- 30% test coverage
- 10+ bugs per release

**After:**
- 200+ reusable components
- Component library (Storybook)
- Scoped CSS (CSS Modules)
- 4 hours to add feature (85% faster)
- 90% test coverage
- 2 bugs per release (80% reduction)

**Metrics:**
- Development speed: +300%
- Code reuse: 40% of codebase
- Bundle size: -60% (code splitting)
- Test coverage: +200%
- Bug rate: -80%

**Best Practices:**

1. **Component Size:**
   - 50-200 lines ideal
   - If >300 lines, split it
   - Single responsibility

2. **Props Interface:**
   - Clear, minimal API
   - TypeScript for type safety
   - Default props for optional values
   - Avoid prop drilling (use Context/Redux)

3. **Composition Patterns:**
   - Prefer composition over inheritance
   - Use children prop
   - Compound components for related UI
   - Render props for flexible behavior

4. **Performance:**
   - Memoization (React.memo)
   - Lazy loading
   - Code splitting
   - Virtual scrolling for lists

**Key Insight:** Component-Based Architecture isn't just about splitting 
UI into pieces—it's about creating a maintainable, scalable system with 
clear boundaries, reusable patterns, and optimal performance. The goal 
is to build a component library that accelerates development while 
maintaining quality."
```
→ Shows architectural depth, real-world experience, and business impact

---

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Component Lifecycle

#### React Component Lifecycle (Class Components - Historical Context)

```
LIFECYCLE PHASES
────────────────

1. MOUNTING (Component Creation)
   │
   ├── constructor()
   │   └── Initialize state, bind methods
   │
   ├── static getDerivedStateFromProps()
   │   └── Sync state with props (rare)
   │
   ├── render()
   │   └── Return JSX (pure, no side effects)
   │
   ├── componentDidMount()
   │   └── DOM ready, fetch data, subscriptions
   │
   └── Component in DOM ✅


2. UPDATING (Props or State Change)
   │
   ├── static getDerivedStateFromProps()
   │   └── Sync state with new props
   │
   ├── shouldComponentUpdate()
   │   └── Return false to skip render (optimization)
   │
   ├── render()
   │   └── Return new JSX
   │
   ├── getSnapshotBeforeUpdate()
   │   └── Capture DOM info before update (rare)
   │
   ├── DOM Updated 🔄
   │
   └── componentDidUpdate()
       └── React to prop/state changes


3. UNMOUNTING (Component Removal)
   │
   └── componentWillUnmount()
       └── Cleanup: subscriptions, timers, listeners
```

**Example:**
```javascript
class UserProfile extends React.Component {
  constructor(props) {
    super(props);
    this.state = { user: null, loading: true };
  }
  
  // MOUNT: Fetch data after component inserted in DOM
  componentDidMount() {
    this.fetchUser(this.props.userId);
    
    // Subscribe to real-time updates
    this.subscription = UserService.subscribe(
      this.props.userId,
      (user) => this.setState({ user })
    );
  }
  
  // UPDATE: Fetch new data if userId prop changes
  componentDidUpdate(prevProps) {
    if (prevProps.userId !== this.props.userId) {
      this.setState({ loading: true });
      this.fetchUser(this.props.userId);
    }
  }
  
  // UNMOUNT: Cleanup subscriptions
  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  
  fetchUser(userId) {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(user => this.setState({ user, loading: false }));
  }
  
  render() {
    const { user, loading } = this.state;
    
    if (loading) return <Spinner />;
    if (!user) return <Error />;
    
    return (
      <div className="user-profile">
        <h1>{user.name}</h1>
        <p>{user.email}</p>
      </div>
    );
  }
}
```

---

#### Modern Hooks Lifecycle

```
HOOKS LIFECYCLE
────────────────

Function Component with Hooks:

1. RENDER PHASE (Pure, can be paused/restarted)
   │
   ├── Function body executes
   │   └── All hooks run (useState, useMemo, etc.)
   │
   └── Return JSX


2. COMMIT PHASE (Cannot be interrupted)
   │
   ├── React updates DOM
   │
   ├── useLayoutEffect (synchronous, blocks paint)
   │   └── Read layout, synchronous DOM updates
   │
   ├── Browser paints screen 🎨
   │
   └── useEffect (asynchronous, after paint)
       └── Side effects: fetch, subscriptions, etc.


3. CLEANUP PHASE
   │
   ├── useEffect cleanup (before next effect)
   │
   └── useEffect cleanup (on unmount)
```

**Hooks Mapping to Lifecycle:**

```javascript
// componentDidMount + componentDidUpdate
useEffect(() => {
  console.log('Runs after every render');
});

// componentDidMount only
useEffect(() => {
  console.log('Runs once after mount');
}, []); // Empty dependency array

// componentDidUpdate (specific dependencies)
useEffect(() => {
  console.log('Runs when userId changes');
}, [userId]);

// componentWillUnmount
useEffect(() => {
  return () => {
    console.log('Cleanup before unmount');
  };
}, []);

// Combined: mount + update + unmount
useEffect(() => {
  // Mount: Subscribe
  const subscription = UserService.subscribe(userId, handleUpdate);
  
  // Unmount: Cleanup
  return () => {
    subscription.unsubscribe();
  };
}, [userId]); // Update: Re-subscribe when userId changes
```

**Modern Example:**
```typescript
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Equivalent to componentDidMount + componentDidUpdate + componentWillUnmount
  useEffect(() => {
    let cancelled = false;
    
    // Fetch user data
    setLoading(true);
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setUser(data);
          setLoading(false);
        }
      });
    
    // Subscribe to real-time updates
    const subscription = UserService.subscribe(userId, (updatedUser) => {
      if (!cancelled) {
        setUser(updatedUser);
      }
    });
    
    // Cleanup function (runs on unmount and before next effect)
    return () => {
      cancelled = true; // Prevent state updates after unmount
      subscription.unsubscribe();
    };
  }, [userId]); // Re-run when userId changes
  
  if (loading) return <Spinner />;
  if (!user) return <Error message="User not found" />;
  
  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

---

### Data Flow in Component-Based Architecture

#### One-Way Data Flow (Unidirectional)

```
PARENT COMPONENT
     │
     │ props ↓ (data flows down)
     │
CHILD COMPONENT
     │
     │ callback ↑ (events flow up)
     │
PARENT COMPONENT (updates state)
     │
     │ new props ↓ (re-render child)
     │
CHILD COMPONENT (updated)
```

**Example:**
```typescript
// Parent: Owns state
function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const handleAddToCart = (product: Product) => {
    setCart([...cart, { ...product, quantity: 1 }]);
  };
  
  return (
    <div>
      {/* Data flows DOWN via props */}
      {products.map(product => (
        <ProductCard 
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart} // Callback flows DOWN
        />
      ))}
      
      <ShoppingCart items={cart} />
    </div>
  );
}

// Child: Receives data, emits events
function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      
      {/* Event flows UP via callback */}
      <button onClick={() => onAddToCart(product)}>
        Add to Cart
      </button>
    </div>
  );
}

// Flow:
// 1. Parent passes product (data ↓) and onAddToCart (callback ↓)
// 2. User clicks button
// 3. Child calls onAddToCart(product) (event ↑)
// 4. Parent updates cart state
// 5. Parent re-renders with new cart
// 6. ShoppingCart receives updated items (data ↓)
```

**Why One-Way Data Flow?**
- **Predictable:** Always know where data comes from (parent)
- **Debuggable:** Trace data flow from top to bottom
- **Testable:** Mock props, assert render output
- **Maintainable:** Clear boundaries, no hidden dependencies

---

#### Props vs State

```
PROPS (External Data)
─────────────────────
✅ Passed from parent
✅ Immutable (read-only)
✅ Can change over time (parent updates)
❌ Cannot be modified by component
✅ Triggers re-render when changed

Use for:
- Configuration (color, size, variant)
- Data from parent (user, products)
- Callbacks (onClick, onChange)


STATE (Internal Data)
─────────────────────
✅ Owned by component
✅ Mutable (can be updated)
✅ Private (not accessible to parent)
✅ Can be initialized from props
✅ Triggers re-render when changed

Use for:
- UI state (isOpen, isLoading)
- Form inputs (value, errors)
- Component-specific data (expanded, selected)
```

**Example:**
```typescript
// Props: External configuration
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'small' | 'medium' | 'large';
  onClick: () => void;
  children: React.ReactNode;
}

function Button({ variant, size, onClick, children }: ButtonProps) {
  // State: Internal UI state
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Cannot modify props (read-only)
  // variant = 'primary'; ❌ Error!
  
  // Can modify state
  const handleMouseDown = () => setIsPressed(true); ✅
  const handleMouseUp = () => setIsPressed(false); ✅
  
  const className = `
    btn 
    btn-${variant} 
    btn-${size}
    ${isPressed ? 'pressed' : ''}
    ${isHovered ? 'hovered' : ''}
  `;
  
  return (
    <button
      className={className}
      onClick={onClick} // Use prop callback
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </button>
  );
}

// Props control behavior, state manages internal UI
```

---

### Component Communication Patterns

#### 1. Parent → Child (Props)

```typescript
// ✅ Direct props passing
function Parent() {
  const [count, setCount] = useState(0);
  
  return (
    <Child count={count} onIncrement={() => setCount(count + 1)} />
  );
}

function Child({ count, onIncrement }: ChildProps) {
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={onIncrement}>Increment</button>
    </div>
  );
}
```

---

#### 2. Child → Parent (Callbacks)

```typescript
// ✅ Lift state up, pass callback down
function Parent() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  
  return (
    <div>
      <ItemList onSelect={setSelectedItem} />
      <ItemDetails itemId={selectedItem} />
    </div>
  );
}

function ItemList({ onSelect }: { onSelect: (id: string) => void }) {
  const items = ['item1', 'item2', 'item3'];
  
  return (
    <ul>
      {items.map(item => (
        <li key={item} onClick={() => onSelect(item)}>
          {item}
        </li>
      ))}
    </ul>
  );
}
```

---

#### 3. Sibling → Sibling (Via Parent)

```typescript
// ✅ State in common parent
function Parent() {
  const [sharedData, setSharedData] = useState('');
  
  return (
    <>
      <ChildA onDataChange={setSharedData} />
      <ChildB data={sharedData} />
    </>
  );
}

function ChildA({ onDataChange }: { onDataChange: (data: string) => void }) {
  return (
    <input onChange={(e) => onDataChange(e.target.value)} />
  );
}

function ChildB({ data }: { data: string }) {
  return <p>Data from sibling: {data}</p>;
}
```

---

#### 4. Deep Component → Deep Component (Context API)

```typescript
// ✅ Avoid props drilling with Context
const ThemeContext = createContext<Theme>({ mode: 'light' });

function App() {
  const [theme, setTheme] = useState<Theme>({ mode: 'light' });
  
  return (
    <ThemeContext.Provider value={theme}>
      <Layout>
        <Sidebar>
          <Menu>
            <MenuItem>
              <ThemeToggle /> {/* Deep nested */}
            </MenuItem>
          </Menu>
        </Sidebar>
        <Content>
          <Article>
            <ThemeSensitiveComponent /> {/* Also needs theme */}
          </Article>
        </Content>
      </Layout>
    </ThemeContext.Provider>
  );
}

// Deep component accesses context directly
function ThemeToggle() {
  const theme = useContext(ThemeContext); // No props drilling!
  
  return (
    <button onClick={() => theme.mode = theme.mode === 'light' ? 'dark' : 'light'}>
      Toggle Theme
    </button>
  );
}
```

---

#### 5. Any Component → Any Component (Global State)

```typescript
// ✅ Redux/Zustand for global state
import { useSelector, useDispatch } from 'react-redux';

function CartButton() {
  // Any component can access cart state
  const itemCount = useSelector((state: RootState) => state.cart.items.length);
  
  return (
    <button>
      Cart ({itemCount})
    </button>
  );
}

function ProductCard({ product }: { product: Product }) {
  const dispatch = useDispatch();
  
  const handleAddToCart = () => {
    // Any component can update cart state
    dispatch(addToCart(product));
  };
  
  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
}

// No parent-child relationship needed
// Cart state managed globally
```

---

### Performance Implications

#### Re-rendering Behavior

```
WHEN DOES A COMPONENT RE-RENDER?
─────────────────────────────────

1. State Changes (useState, useReducer)
   this.setState() → Re-render ✅

2. Props Changes
   Parent re-renders with new props → Child re-renders ✅

3. Parent Re-renders (even if props unchanged)
   Parent re-renders → ALL children re-render ❌
   (This is the performance killer!)

4. Context Changes
   Context value changes → All consumers re-render ✅
```

**Problem Example:**
```typescript
function Parent() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Increment: {count}
      </button>
      
      {/* ExpensiveChild re-renders on EVERY count change */}
      <ExpensiveChild />
    </div>
  );
}

function ExpensiveChild() {
  console.log('ExpensiveChild rendered'); // Logs on every parent update
  
  // Heavy computation
  const data = computeExpensiveData(); // Runs on every render ❌
  
  return <div>{/* Complex UI */}</div>;
}

// Result:
// User clicks button → Parent re-renders → ExpensiveChild re-renders
// Even though ExpensiveChild receives no props!
```

**Solution 1: React.memo (Prevent re-renders)**
```typescript
// Memoize component (only re-render if props change)
const ExpensiveChild = React.memo(function ExpensiveChild() {
  console.log('ExpensiveChild rendered'); // Only logs once
  
  const data = computeExpensiveData();
  
  return <div>{/* Complex UI */}</div>;
});

// Now:
// User clicks button → Parent re-renders → ExpensiveChild skips re-render ✅
// (because props didn't change)
```

**Solution 2: useMemo (Memoize values)**
```typescript
function ExpensiveChild() {
  // Compute once, reuse on subsequent renders
  const data = useMemo(() => {
    console.log('Computing expensive data');
    return computeExpensiveData();
  }, []); // Empty deps = compute once
  
  return <div>{data.value}</div>;
}

// computeExpensiveData() runs once, result cached
```

**Solution 3: useCallback (Memoize functions)**
```typescript
function Parent() {
  const [count, setCount] = useState(0);
  
  // ❌ BAD: New function on every render
  const handleClick = () => {
    console.log('Clicked');
  };
  
  // ✅ GOOD: Same function reference
  const handleClickMemoized = useCallback(() => {
    console.log('Clicked');
  }, []); // Dependencies: none
  
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Increment: {count}
      </button>
      
      {/* Child receives same callback reference */}
      <ExpensiveChild onClick={handleClickMemoized} />
    </div>
  );
}

const ExpensiveChild = React.memo(function ExpensiveChild({ 
  onClick 
}: { 
  onClick: () => void 
}) {
  // Without useCallback: onClick is new function → re-render
  // With useCallback: onClick is same function → skip re-render ✅
  
  return <button onClick={onClick}>Click Me</button>;
});
```

---

#### Reconciliation (Virtual DOM Diffing)

```
RECONCILIATION PROCESS
──────────────────────

1. State/Props Change
   │
   ↓
2. Component Re-renders
   │
   ↓
3. New Virtual DOM Created
   │
   ↓
4. Diff Algorithm
   │  Compare old vs new Virtual DOM
   │  Find minimal set of changes
   │
   ↓
5. Update Real DOM
   │  Only changed elements
   │
   ↓
6. Browser Re-paints


DIFFING ALGORITHM:
─────────────────

Rule 1: Different element types → Replace entire subtree
  <div> → <span>  = Replace whole tree

Rule 2: Same element type → Update attributes only
  <div class="old"> → <div class="new">  = Update class

Rule 3: Component with same type → Keep instance, update props
  <Button color="red"> → <Button color="blue">  = Update prop

Rule 4: List items need keys for efficient reconciliation
  [A, B, C] → [A, C, B]  with keys = Reorder
  [A, B, C] → [A, C, B]  without keys = Replace all ❌
```

**Example:**
```typescript
// ❌ BAD: No keys (inefficient)
function List({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map(item => (
        <li>{item}</li>  // React can't track which item moved
      ))}
    </ul>
  );
}

// Scenario: ['A', 'B', 'C'] → ['A', 'C', 'B']
// React sees: C is now at index 1, B is now at index 2
// React thinks: Replace item at index 1, replace item at index 2 ❌
// Result: 2 DOM updates (inefficient)


// ✅ GOOD: With keys (efficient)
function List({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>  // React tracks by ID
      ))}
    </ul>
  );
}

// Scenario: [A, B, C] → [A, C, B]  (where each has unique ID)
// React sees: Item with id=C moved, item with id=B moved
// React thinks: Reorder existing DOM nodes ✅
// Result: 0 DOM replacements, 2 DOM moves (efficient)
```

---

### Memory Management

#### Component Memory Lifecycle

```
MEMORY ALLOCATION
─────────────────

Component Mounts:
├── Allocate memory for:
│   ├── Component instance
│   ├── State variables
│   ├── Props
│   ├── Event listeners
│   ├── Subscriptions
│   ├── Timers/Intervals
│   └── Cached values (useMemo, useCallback)

Component Updates:
├── Keep existing memory
├── Update state/props in place
├── Create new closures (can cause leaks!)

Component Unmounts:
├── Deallocate memory
├── BUT: Memory leaks if cleanup missing!
```

**Common Memory Leaks:**

**1. Event Listeners Not Removed:**
```typescript
// ❌ BAD: Listener never removed
function Component() {
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    // Missing cleanup!
  }, []);
  
  const handleResize = () => {
    console.log('Resized');
  };
  
  return <div>...</div>;
}

// Component unmounts → Listener still active → Memory leak ❌
// window holds reference to handleResize → Component can't be GC'd


// ✅ GOOD: Cleanup listener
function Component() {
  useEffect(() => {
    const handleResize = () => {
      console.log('Resized');
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return <div>...</div>;
}
```

**2. Timers Not Cleared:**
```typescript
// ❌ BAD: Interval keeps running
function Component() {
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Tick');
    }, 1000);
    // Missing cleanup!
  }, []);
  
  return <div>...</div>;
}

// Component unmounts → Interval keeps running → Memory leak ❌


// ✅ GOOD: Clear interval
function Component() {
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Tick');
    }, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  return <div>...</div>;
}
```

**3. Subscriptions Not Unsubscribed:**
```typescript
// ❌ BAD: Subscription leak
function Component({ userId }: { userId: string }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const subscription = DataService.subscribe(userId, setData);
    // Missing cleanup!
  }, [userId]);
  
  return <div>{data}</div>;
}


// ✅ GOOD: Unsubscribe on cleanup
function Component({ userId }: { userId: string }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const subscription = DataService.subscribe(userId, setData);
    
    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);
  
  return <div>{data}</div>;
}
```

**4. State Updates After Unmount:**
```typescript
// ❌ BAD: setState after unmount
function Component() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData().then(result => {
      setData(result); // Might run after unmount ❌
    });
  }, []);
  
  return <div>{data}</div>;
}

// Component unmounts before fetch completes
// → setData runs on unmounted component
// → Warning: "Can't perform state update on unmounted component"


// ✅ GOOD: Check if mounted
function Component() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    let cancelled = false;
    
    fetchData().then(result => {
      if (!cancelled) {
        setData(result); ✅
      }
    });
    
    return () => {
      cancelled = true; // Prevent state update after unmount
    };
  }, []);
  
  return <div>{data}</div>;
}
```

---

### Error Boundaries

**Problem:** JavaScript errors in components shouldn't crash the entire app.

```
WITHOUT ERROR BOUNDARIES:
─────────────────────────

<App>
  <Header /> ✅
  <Sidebar /> ✅
  <MainContent>
    <ProductList /> ❌ Error: Cannot read property 'map' of undefined
  </MainContent>
  <Footer /> ✅
</App>

Result: Entire app crashes → White screen ❌
Users see nothing, app unusable
```

```
WITH ERROR BOUNDARIES:
──────────────────────

<App>
  <Header /> ✅
  <Sidebar /> ✅
  <ErrorBoundary fallback={<ErrorMessage />}>
    <MainContent>
      <ProductList /> ❌ Error caught by boundary
    </MainContent>
  </ErrorBoundary>
  <Footer /> ✅
</App>

Result: Only ProductList fails → Rest of app works ✅
Users can still use Header, Sidebar, Footer
Error displayed gracefully
```

**Implementation:**

```typescript
// Error Boundary Component (Class-based, no hooks equivalent yet)
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  // Catch errors during render
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  // Log error details
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Send to error tracking service
    logErrorToService(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return this.props.fallback;
    }
    
    return this.props.children;
  }
}

// Usage:
function App() {
  return (
    <ErrorBoundary fallback={<ErrorMessage />}>
      <Dashboard />
    </ErrorBoundary>
  );
}

function ErrorMessage() {
  return (
    <div className="error-container">
      <h1>Something went wrong</h1>
      <p>We're working on fixing this issue.</p>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  );
}
```

**Strategic Placement:**

```typescript
// Granular error boundaries (recommended)
function App() {
  return (
    <div>
      {/* Header boundary */}
      <ErrorBoundary fallback={<HeaderError />}>
        <Header />
      </ErrorBoundary>
      
      <div className="main-layout">
        {/* Sidebar boundary */}
        <ErrorBoundary fallback={<SidebarError />}>
          <Sidebar />
        </ErrorBoundary>
        
        {/* Main content boundary */}
        <ErrorBoundary fallback={<ContentError />}>
          <MainContent />
        </ErrorBoundary>
      </div>
      
      {/* Footer boundary */}
      <ErrorBoundary fallback={<FooterError />}>
        <Footer />
      </ErrorBoundary>
    </div>
  );
}

// Benefit: Error in one section doesn't affect others
// Header fails → Sidebar, MainContent, Footer still work ✅
```

**What Error Boundaries DON'T Catch:**

```typescript
// ❌ Event handlers (use try-catch)
function Button() {
  const handleClick = () => {
    throw new Error('Event error'); // Not caught by error boundary
  };
  
  return <button onClick={handleClick}>Click</button>;
}

// ✅ Correct way:
function Button() {
  const handleClick = () => {
    try {
      // Code that might throw
      riskyOperation();
    } catch (error) {
      logError(error);
      showNotification('Operation failed');
    }
  };
  
  return <button onClick={handleClick}>Click</button>;
}


// ❌ Async code (use try-catch)
function Component() {
  useEffect(() => {
    fetchData(); // Error here not caught
  }, []);
}

// ✅ Correct way:
function Component() {
  useEffect(() => {
    fetchData().catch(error => {
      logError(error);
      setError(error);
    });
  }, []);
}


// ❌ Server-side rendering errors
// ❌ Errors in error boundary itself
```

---

### Component Boundaries and Responsibility

**SOLID Principles Applied to Components:**

#### 1. Single Responsibility Principle

```typescript
// ❌ BAD: Component does too much
function UserDashboard({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    // Fetch user
    fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
    
    // Fetch posts
    fetch(`/api/posts?userId=${userId}`).then(r => r.json()).then(setPosts);
    
    // Fetch friends
    fetch(`/api/friends?userId=${userId}`).then(r => r.json()).then(setFriends);
    
    // Fetch notifications
    fetch(`/api/notifications`).then(r => r.json()).then(setNotifications);
  }, [userId]);
  
  return (
    <div>
      {/* Render user profile */}
      {/* Render posts */}
      {/* Render friends */}
      {/* Render notifications */}
      {/* ... 500 lines */}
    </div>
  );
}

// Problems:
// - Hard to test (too many concerns)
// - Hard to reuse (tightly coupled)
// - Hard to maintain (change ripples everywhere)
// - Performance issues (re-renders everything)


// ✅ GOOD: Split by responsibility
function UserDashboard({ userId }: { userId: string }) {
  return (
    <div className="dashboard">
      <UserProfile userId={userId} />       {/* Fetches & displays user */}
      <UserPosts userId={userId} />         {/* Fetches & displays posts */}
      <UserFriends userId={userId} />       {/* Fetches & displays friends */}
      <UserNotifications userId={userId} /> {/* Fetches & displays notifications */}
    </div>
  );
}

// Each component:
// - Has one clear responsibility
// - Can be tested independently
// - Can be reused elsewhere
// - Optimized independently
```

#### 2. Open/Closed Principle

```typescript
// ✅ Open for extension, closed for modification
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

function Button({ 
  variant = 'primary',
  size = 'medium',
  icon,
  loading,
  disabled,
  onClick,
  children 
}: ButtonProps) {
  const className = `btn btn-${variant} btn-${size}`;
  
  return (
    <button 
      className={className}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Spinner />}
      {icon && <span className="icon">{icon}</span>}
      {children}
    </button>
  );
}

// Extend with new variants without modifying code:
<Button variant="primary">Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="danger" icon={<TrashIcon />}>Delete</Button>
<Button loading>Saving...</Button>

// Add new variant: Just update CSS
// .btn-success { ... }
```

#### 3. Dependency Inversion Principle

```typescript
// ❌ BAD: Direct dependency on concrete implementation
function UserList() {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    // Direct dependency on fetch API
    fetch('/api/users')
      .then(r => r.json())
      .then(setUsers);
  }, []);
  
  return <div>{users.map(u => <UserCard user={u} />)}</div>;
}

// Problems:
// - Hard to test (can't mock fetch)
// - Tightly coupled to API
// - Can't switch data source


// ✅ GOOD: Depend on abstraction
interface UserService {
  getUsers(): Promise<User[]>;
}

function UserList({ userService }: { userService: UserService }) {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    // Depend on interface, not implementation
    userService.getUsers().then(setUsers);
  }, [userService]);
  
  return <div>{users.map(u => <UserCard user={u} />)}</div>;
}

// Can swap implementations:
const apiService: UserService = {
  getUsers: () => fetch('/api/users').then(r => r.json())
};

const mockService: UserService = {
  getUsers: () => Promise.resolve([{ id: 1, name: 'Test' }])
};

// Production:
<UserList userService={apiService} />

// Testing:
<UserList userService={mockService} />
```

---

### Component Testing Strategies

#### 1. Unit Testing (Presentational Components)

```typescript
// Component to test
function Button({ onClick, children, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// Test with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Click Me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

#### 2. Integration Testing (Container Components)

```typescript
// Component with data fetching
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUser(userId).then(data => {
      setUser(data);
      setLoading(false);
    });
  }, [userId]);
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;
  
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// Test with mocked API
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('./api', () => ({
  fetchUser: jest.fn()
}));

describe('UserProfile', () => {
  it('displays loading state initially', () => {
    fetchUser.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<UserProfile userId="123" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
  
  it('displays user data after loading', async () => {
    const mockUser = { id: '123', name: 'John Doe', email: 'john@example.com' };
    fetchUser.mockResolvedValue(mockUser);
    
    render(<UserProfile userId="123" />);
    
    // Wait for async operation
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });
  
  it('displays error message when user not found', async () => {
    fetchUser.mockResolvedValue(null);
    
    render(<UserProfile userId="123" />);
    
    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });
});
```

#### 3. Snapshot Testing

```typescript
// Component
function ProductCard({ product }: { product: Product }) {
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button>Add to Cart</button>
    </div>
  );
}

// Snapshot test
import { render } from '@testing-library/react';

describe('ProductCard', () => {
  it('matches snapshot', () => {
    const product = {
      id: '1',
      name: 'Product Name',
      price: 29.99,
      image: 'product.jpg'
    };
    
    const { container } = render(<ProductCard product={product} />);
    expect(container).toMatchSnapshot();
  });
});

// First run: Creates snapshot file
// Subsequent runs: Compares against snapshot
// If UI changes unintentionally → Test fails
```

---

### Scaling Component Architecture

#### Problem: Growing Component Library

```
SMALL APP (10-50 components):
─────────────────────────────
src/
├── components/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   └── Modal.tsx
└── pages/
    ├── Home.tsx
    └── About.tsx

✅ Simple, flat structure
✅ Easy to find components


MEDIUM APP (50-200 components):
────────────────────────────────
src/
├── components/
│   ├── common/          ← Reusable components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   ├── features/        ← Feature-specific
│   │   ├── Auth/
│   │   ├── Dashboard/
│   │   └── Profile/
│   └── layouts/         ← Page layouts
│       ├── MainLayout.tsx
│       └── AuthLayout.tsx
└── pages/

⚠️ Need organization
✅ Grouped by type/feature


LARGE APP (200+ components):
────────────────────────────
src/
├── components/
│   ├── ui/              ← Design system
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   └── Button.module.css
│   │   ├── Input/
│   │   └── Card/
│   │
│   ├── features/        ← Feature modules
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── types/
│   │   ├── dashboard/
│   │   └── profile/
│   │
│   └── shared/          ← Cross-feature
│       ├── ErrorBoundary/
│       ├── LoadingSpinner/
│       └── EmptyState/
└── pages/

✅ Modular
✅ Scalable
✅ Clear ownership
```

#### Design System Pattern

```typescript
// 1. Define design tokens
export const tokens = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    danger: '#dc3545',
    success: '#28a745',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    fontSize: {
      sm: '12px',
      md: '14px',
      lg: '16px',
      xl: '20px',
    },
  },
};

// 2. Build primitive components
function Button({ variant = 'primary', size = 'md', children, ...props }: ButtonProps) {
  const styles = {
    backgroundColor: tokens.colors[variant],
    padding: size === 'sm' ? tokens.spacing.sm : tokens.spacing.md,
    fontSize: tokens.typography.fontSize[size],
  };
  
  return (
    <button style={styles} {...props}>
      {children}
    </button>
  );
}

// 3. Compose complex components
function Dialog({ title, content, onConfirm, onCancel }: DialogProps) {
  return (
    <div className="dialog">
      <h2>{title}</h2>
      <p>{content}</p>
      <div className="dialog-actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Confirm
        </Button>
      </div>
    </div>
  );
}

// 4. Document with Storybook
export default {
  title: 'Components/Button',
  component: Button,
};

export const Primary = () => <Button variant="primary">Primary</Button>;
export const Secondary = () => <Button variant="secondary">Secondary</Button>;
export const Danger = () => <Button variant="danger">Danger</Button>;
export const Loading = () => <Button loading>Loading...</Button>;
```

---

## 3. Clear Real-World Examples

### Example 1: E-Commerce Product Listing (Component Breakdown)

**Requirements:**
- Display 100+ products
- Filter by category, price
- Sort by price, rating
- Pagination
- Add to cart
- Optimistic UI updates

**Component Architecture:**

```typescript
/**
 * TOP-LEVEL CONTAINER
 * Manages state and orchestration
 */
function ProductListingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [sortBy, setSortBy] = useState<SortOption>('price');
  const [page, setPage] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Fetch products with filters
  useEffect(() => {
    fetchProducts({ filters, sortBy, page }).then(setProducts);
  }, [filters, sortBy, page]);
  
  const handleAddToCart = (product: Product) => {
    // Optimistic update
    setCart([...cart, { ...product, quantity: 1 }]);
    
    // API call
    addToCartAPI(product.id).catch(() => {
      // Rollback on error
      setCart(cart.filter(item => item.id !== product.id));
    });
  };
  
  return (
    <div className="product-listing-page">
      {/* Header with cart badge */}
      <Header cartItemCount={cart.length} />
      
      <div className="main-content">
        {/* Filter sidebar */}
        <FilterSidebar 
          filters={filters}
          onFilterChange={setFilters}
        />
        
        {/* Product grid */}
        <div className="product-section">
          <ProductListHeader 
            sortBy={sortBy}
            onSortChange={setSortBy}
            resultCount={products.length}
          />
          
          <ProductGrid 
            products={products}
            onAddToCart={handleAddToCart}
          />
          
          <Pagination 
            currentPage={page}
            totalPages={10}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}


/**
 * FILTER SIDEBAR (Smart Component)
 * Manages filter state and UI
 */
function FilterSidebar({ filters, onFilterChange }: FilterSidebarProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  
  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);
  
  const handleCategoryToggle = (category: string) => {
    const newCategories = filters.categories?.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...(filters.categories || []), category];
    
    onFilterChange({ ...filters, categories: newCategories });
  };
  
  return (
    <aside className="filter-sidebar">
      <FilterSection title="Category">
        {categories.map(category => (
          <Checkbox
            key={category}
            label={category}
            checked={filters.categories?.includes(category)}
            onChange={() => handleCategoryToggle(category)}
          />
        ))}
      </FilterSection>
      
      <FilterSection title="Price Range">
        <PriceRangeSlider
          min={0}
          max={1000}
          value={priceRange}
          onChange={(range) => {
            setPriceRange(range);
            onFilterChange({ ...filters, priceRange: range });
          }}
        />
      </FilterSection>
      
      <Button onClick={() => onFilterChange({})}>
        Clear Filters
      </Button>
    </aside>
  );
}


/**
 * PRODUCT GRID (Presentational Component)
 * Renders product cards in grid layout
 */
function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  if (products.length === 0) {
    return <EmptyState message="No products found" />;
  }
  
  return (
    <div className="product-grid">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}


/**
 * PRODUCT CARD (Presentational Component)
 * Displays single product with add to cart
 */
const ProductCard = React.memo(function ProductCard({ 
  product, 
  onAddToCart 
}: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  const handleAddToCart = async () => {
    setIsAdding(true);
    await onAddToCart(product);
    setIsAdding(false);
  };
  
  return (
    <div className="product-card">
      <img 
        src={product.image} 
        alt={product.name}
        loading="lazy"
      />
      
      <div className="product-info">
        <h3>{product.name}</h3>
        <p className="description">{product.description}</p>
        
        <div className="product-footer">
          <span className="price">${product.price}</span>
          <Rating value={product.rating} />
        </div>
        
        <Button
          onClick={handleAddToCart}
          disabled={isAdding}
          loading={isAdding}
        >
          {isAdding ? 'Adding...' : 'Add to Cart'}
        </Button>
      </div>
    </div>
  );
});


/**
 * REUSABLE PRIMITIVES
 */
function Button({ onClick, disabled, loading, children }: ButtonProps) {
  return (
    <button 
      className="btn"
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <Spinner size="small" />}
      {children}
    </button>
  );
}

function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <label className="checkbox">
      <input 
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
      <span>{label}</span>
    </label>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <div className="rating">
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} className={star <= value ? 'filled' : 'empty'}>
          ★
        </span>
      ))}
    </div>
  );
}
```

**Component Hierarchy:**
```
ProductListingPage (Container)
├── Header (Presentational)
│   └── CartBadge (Presentational)
├── FilterSidebar (Smart)
│   ├── FilterSection (Presentational)
│   │   └── Checkbox (Primitive)
│   └── PriceRangeSlider (Smart)
└── ProductSection
    ├── ProductListHeader (Presentational)
    ├── ProductGrid (Presentational)
    │   └── ProductCard (Presentational) × N
    │       ├── Image
    │       ├── Rating (Primitive)
    │       └── Button (Primitive)
    └── Pagination (Smart)

Total: ~15 components
Reusable: Button, Checkbox, Rating (used elsewhere)
Testable: Each component independently tested
```

**Performance Optimizations:**
1. **React.memo on ProductCard** → Prevents re-render when other products update
2. **Lazy loading images** → Faster initial load
3. **Pagination** → Only render 20 products at a time
4. **Optimistic updates** → Instant UI feedback

---

### Example 2: Real-Time Chat Application

**Requirements:**
- Display message list (1000+ messages)
- Real-time updates via WebSocket
- Typing indicators
- Read receipts
- Scroll to bottom on new message
- Virtual scrolling for performance

**Component Architecture:**

```typescript
/**
 * CHAT CONTAINER
 * Manages WebSocket connection and state
 */
function ChatRoom({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [currentUser] = useState<User>(getCurrentUser());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(`wss://api.example.com/chat/${roomId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'message') {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
      } else if (data.type === 'typing') {
        setTypingUsers(data.users);
      }
    };
    
    return () => {
      ws.close();
    };
  }, [roomId]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = (text: string) => {
    const message: Message = {
      id: generateId(),
      text,
      userId: currentUser.id,
      timestamp: Date.now(),
    };
    
    // Optimistic update
    setMessages(prev => [...prev, message]);
    
    // Send to server
    ws.send(JSON.stringify({ type: 'message', message }));
  };
  
  return (
    <div className="chat-room">
      <ChatHeader roomId={roomId} />
      
      <MessageList 
        messages={messages}
        currentUserId={currentUser.id}
      />
      
      {typingUsers.length > 0 && (
        <TypingIndicator users={typingUsers} />
      )}
      
      <div ref={messagesEndRef} />
      
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}


/**
 * MESSAGE LIST (Virtual Scrolling)
 * Renders only visible messages for performance
 */
function MessageList({ messages, currentUserId }: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Virtual scrolling: Only render visible items
  const rowVirtualizer = useVirtual({
    size: messages.length,
    parentRef,
    estimateSize: useCallback(() => 80, []), // Estimate message height
    overscan: 5, // Render 5 extra items above/below viewport
  });
  
  return (
    <div ref={parentRef} className="message-list" style={{ height: '500px', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.totalSize}px`, position: 'relative' }}>
        {rowVirtualizer.virtualItems.map(virtualRow => {
          const message = messages[virtualRow.index];
          const isOwnMessage = message.userId === currentUserId;
          
          return (
            <div
              key={message.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MessageBubble 
                message={message}
                isOwnMessage={isOwnMessage}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}


/**
 * MESSAGE BUBBLE (Presentational)
 */
const MessageBubble = React.memo(function MessageBubble({ 
  message, 
  isOwnMessage 
}: MessageBubbleProps) {
  return (
    <div className={`message-bubble ${isOwnMessage ? 'own' : 'other'}`}>
      {!isOwnMessage && (
        <Avatar userId={message.userId} size="small" />
      )}
      
      <div className="message-content">
        <p>{message.text}</p>
        <span className="timestamp">
          {formatTime(message.timestamp)}
        </span>
        {message.read && <ReadReceipt />}
      </div>
    </div>
  );
});


/**
 * MESSAGE INPUT (Smart Component)
 */
function MessageInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Debounced typing indicator
  const debouncedTyping = useMemo(
    () => debounce(() => setIsTyping(false), 1000),
    []
  );
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      // Send typing event to server
    }
    
    debouncedTyping();
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (text.trim()) {
      onSend(text);
      setText('');
      setIsTyping(false);
    }
  };
  
  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={handleChange}
        placeholder="Type a message..."
        rows={3}
      />
      <Button type="submit" disabled={!text.trim()}>
        Send
      </Button>
    </form>
  );
}


/**
 * TYPING INDICATOR
 */
function TypingIndicator({ users }: { users: string[] }) {
  const text = users.length === 1
    ? `${users[0]} is typing...`
    : `${users.length} people are typing...`;
  
  return (
    <div className="typing-indicator">
      <span className="dots">
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </span>
      <span>{text}</span>
    </div>
  );
}
```

**Performance Optimizations:**
1. **Virtual scrolling** → Only render visible messages (10-20 out of 1000+)
2. **React.memo on MessageBubble** → Prevent re-render when new messages arrive
3. **Debounced typing indicator** → Reduce WebSocket traffic
4. **Optimistic updates** → Instant message display

**Memory Management:**
- WebSocket cleanup on unmount
- Virtual scrolling limits DOM nodes
- Debounce cleanup

---

### Example 3: Dashboard with Live Data (Polling & State Management)

**Requirements:**
- Display 5 metric cards (updated every 5 seconds)
- Line chart (updated every 10 seconds)
- Activity feed (real-time updates)
- Handle stale data
- Graceful error handling

**Component Architecture:**

```typescript
/**
 * DASHBOARD CONTAINER
 * Orchestrates polling and data fetching
 */
function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Poll metrics every 5 seconds
  usePolling(
    async () => {
      const data = await fetchMetrics();
      setMetrics(data);
    },
    5000,
    { enabled: !error }
  );
  
  // Poll chart data every 10 seconds
  usePolling(
    async () => {
      const data = await fetchChartData();
      setChartData(data);
    },
    10000,
    { enabled: !error }
  );
  
  // WebSocket for real-time activities
  useEffect(() => {
    const ws = new WebSocket('wss://api.example.com/activities');
    
    ws.onmessage = (event) => {
      const activity = JSON.parse(event.data);
      setActivities(prev => [activity, ...prev].slice(0, 50)); // Keep last 50
    };
    
    ws.onerror = () => {
      setError(new Error('WebSocket connection failed'));
    };
    
    return () => ws.close();
  }, []);
  
  // Initial data fetch
  useEffect(() => {
    Promise.all([
      fetchMetrics(),
      fetchChartData(),
      fetchActivities()
    ])
      .then(([metricsData, chartData, activitiesData]) => {
        setMetrics(metricsData);
        setChartData(chartData);
        setActivities(activitiesData);
        setIsLoading(false);
      })
      .catch(setError);
  }, []);
  
  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;
  
  return (
    <div className="dashboard">
      <DashboardHeader />
      
      <ErrorBoundary fallback={<MetricsError />}>
        <MetricsGrid metrics={metrics} />
      </ErrorBoundary>
      
      <div className="dashboard-content">
        <ErrorBoundary fallback={<ChartError />}>
          <ChartSection data={chartData} />
        </ErrorBoundary>
        
        <ErrorBoundary fallback={<ActivityError />}>
          <ActivityFeed activities={activities} />
        </ErrorBoundary>
      </div>
    </div>
  );
}


/**
 * METRICS GRID
 * Displays metric cards with loading states
 */
function MetricsGrid({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) return <MetricsGridSkeleton />;
  
  return (
    <div className="metrics-grid">
      <MetricCard
        title="Active Users"
        value={metrics.activeUsers}
        change={metrics.activeUsersChange}
        icon={<UsersIcon />}
      />
      <MetricCard
        title="Revenue"
        value={`$${metrics.revenue}`}
        change={metrics.revenueChange}
        icon={<DollarIcon />}
      />
      <MetricCard
        title="Conversion Rate"
        value={`${metrics.conversionRate}%`}
        change={metrics.conversionRateChange}
        icon={<ChartIcon />}
      />
      <MetricCard
        title="Page Views"
        value={metrics.pageViews}
        change={metrics.pageViewsChange}
        icon={<EyeIcon />}
      />
      <MetricCard
        title="Bounce Rate"
        value={`${metrics.bounceRate}%`}
        change={metrics.bounceRateChange}
        icon={<BounceIcon />}
      />
    </div>
  );
}


/**
 * METRIC CARD (Presentational)
 * Displays single metric with change indicator
 */
const MetricCard = React.memo(function MetricCard({
  title,
  value,
  change,
  icon
}: MetricCardProps) {
  const isPositive = change > 0;
  const changeColor = isPositive ? 'green' : 'red';
  const changeIcon = isPositive ? '↑' : '↓';
  
  return (
    <div className="metric-card">
      <div className="metric-header">
        {icon}
        <h3>{title}</h3>
      </div>
      
      <div className="metric-value">{value}</div>
      
      <div className="metric-change" style={{ color: changeColor }}>
        {changeIcon} {Math.abs(change)}% from last week
      </div>
    </div>
  );
});


/**
 * CHART SECTION
 * Line chart with time series data
 */
function ChartSection({ data }: { data: ChartData | null }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  
  if (!data) return <ChartSkeleton />;
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };
  
  return (
    <div className="chart-section">
      <div className="chart-header">
        <h2>Revenue Trend</h2>
        <TimeRangeSelector 
          value={timeRange}
          onChange={setTimeRange}
          options={['24h', '7d', '30d', '90d']}
        />
      </div>
      
      <div className="chart-container" style={{ height: '300px' }}>
        <Line data={data} options={chartOptions} />
      </div>
    </div>
  );
}


/**
 * ACTIVITY FEED
 * Virtual scrolling for performance
 */
function ActivityFeed({ activities }: { activities: Activity[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtual({
    size: activities.length,
    parentRef,
    estimateSize: useCallback(() => 60, []),
  });
  
  return (
    <div className="activity-feed">
      <h2>Recent Activity</h2>
      
      <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
        <div style={{ height: `${rowVirtualizer.totalSize}px`, position: 'relative' }}>
          {rowVirtualizer.virtualItems.map(virtualRow => {
            const activity = activities[virtualRow.index];
            
            return (
              <div
                key={activity.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <ActivityItem activity={activity} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


/**
 * ACTIVITY ITEM (Presentational)
 */
const ActivityItem = React.memo(function ActivityItem({ 
  activity 
}: { 
  activity: Activity 
}) {
  return (
    <div className="activity-item">
      <Avatar userId={activity.userId} size="small" />
      <div className="activity-content">
        <p>{activity.message}</p>
        <span className="activity-time">
          {formatRelativeTime(activity.timestamp)}
        </span>
      </div>
    </div>
  );
});


/**
 * CUSTOM HOOK: POLLING
 */
function usePolling(
  callback: () => Promise<void>,
  interval: number,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const savedCallback = useRef(callback);
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (!enabled) return;
    
    const tick = () => {
      savedCallback.current();
    };
    
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval, enabled]);
}
```

**Key Patterns Used:**
1. **Multiple data sources** → Separate polling intervals, WebSocket for real-time
2. **Error boundaries** → Isolate failures to specific sections
3. **Virtual scrolling** → Handle 1000+ activity items
4. **React.memo** → Prevent unnecessary re-renders of metric cards
5. **Custom hooks** → Reusable polling logic

---

## 4. Interview-Oriented Explanation

### Sample Interview Answer (7+ Years Experience)

**Question:** "Explain component-based architecture. How would you design a large-scale application using components?"

**Your Answer:**

> "Component-Based Architecture is the foundation of modern frontend development, where we build UIs as a composition of independent, reusable, self-contained units called components.
>
> **Core Philosophy:**
>
> Instead of building monolithic pages with jQuery and global state, we break the UI into modular pieces, each with clear responsibilities:
>
> ```typescript
> // Traditional approach:
> <div id="app">
>   <!-- 1000 lines of HTML -->
> </div>
> <script>
>   // 2000 lines of jQuery manipulating DOM
>   $('#button').click(function() { ... });
> </script>
> 
> // Component-based approach:
> function App() {
>   return (
>     <Layout>
>       <Header />
>       <MainContent>
>         <ProductList />
>         <ShoppingCart />
>       </MainContent>
>       <Footer />
>     </Layout>
>   );
> }
> ```
>
> **Key Principles:**
>
> **1. Encapsulation:**
> Each component owns its structure, styling, behavior, and state:
> ```typescript
> function Button({ onClick, children }) {
>   const [isPressed, setIsPressed] = useState(false);
>   
>   return (
>     <button 
>       className="btn"
>       onClick={onClick}
>       onMouseDown={() => setIsPressed(true)}
>       onMouseUp={() => setIsPressed(false)}
>     >
>       {children}
>     </button>
>   );
> }
> ```
>
> **2. Composition:**
> Build complex UIs by combining simple components:
> ```typescript
> function Dialog({ title, content }) {
>   return (
>     <Modal>
>       <ModalHeader>{title}</ModalHeader>
>       <ModalBody>{content}</ModalBody>
>       <ModalFooter>
>         <Button variant="secondary">Cancel</Button>
>         <Button variant="primary">Confirm</Button>
>       </ModalFooter>
>     </Modal>
>   );
> }
> ```
>
> **3. Reusability:**
> Write once, use everywhere:
> ```typescript
> // Same Button component used in multiple contexts
> <Button onClick={save}>Save</Button>
> <Button onClick={cancel} variant="secondary">Cancel</Button>
> <Button onClick={delete} variant="danger">Delete</Button>
> ```
>
> **Component Types:**
>
> I categorize components into several types:
>
> **Presentational (Dumb):**
> - Pure functions: props in → JSX out
> - No state or side effects
> - Highly testable and reusable
> ```typescript
> function UserCard({ name, email, avatar }) {
>   return (
>     <div className="user-card">
>       <img src={avatar} alt={name} />
>       <h3>{name}</h3>
>       <p>{email}</p>
>     </div>
>   );
> }
> ```
>
> **Container (Smart):**
> - Manages state and side effects
> - Orchestrates data flow
> - Delegates rendering to presentational components
> ```typescript
> function UserCardContainer({ userId }) {
>   const [user, setUser] = useState(null);
>   
>   useEffect(() => {
>     fetchUser(userId).then(setUser);
>   }, [userId]);
>   
>   if (!user) return <Spinner />;
>   return <UserCard {...user} />;
> }
> ```
>
> **Designing Large-Scale Applications:**
>
> For large applications (200+ components), I follow this structure:
>
> ```
> src/
> ├── components/
> │   ├── ui/              ← Design system primitives
> │   │   ├── Button/
> │   │   ├── Input/
> │   │   └── Card/
> │   │
> │   ├── features/        ← Feature modules (self-contained)
> │   │   ├── auth/
> │   │   │   ├── components/
> │   │   │   ├── hooks/
> │   │   │   ├── services/
> │   │   │   └── types/
> │   │   ├── dashboard/
> │   │   └── products/
> │   │
> │   └── shared/          ← Cross-feature components
> │       ├── ErrorBoundary/
> │       ├── Layout/
> │       └── Navigation/
> ```
>
> **Key Architectural Decisions:**
>
> **1. Component Boundaries:**
> Follow Single Responsibility Principle:
> ```typescript
> // ❌ Bad: Does too much
> function UserDashboard() {
>   // Fetches data, renders profile, posts, settings
>   // 500 lines of code
> }
> 
> // ✅ Good: Clear separation
> function UserDashboard() {
>   return (
>     <>
>       <UserProfile />  // Fetches & renders profile
>       <UserPosts />    // Fetches & renders posts
>       <UserSettings /> // Fetches & renders settings
>     </>
>   );
> }
> ```
>
> **2. Data Flow:**
> Enforce unidirectional flow (parent → child):
> ```typescript
> function Parent() {
>   const [state, setState] = useState();
>   
>   return (
>     <Child 
>       data={state}                    // Data flows down
>       onChange={(val) => setState(val)} // Events flow up
>     />
>   );
> }
> ```
>
> **3. State Management:**
> Choose the right tool:
> - Local state (useState) → Component-specific UI state
> - Context → Share data with deep descendants
> - Redux/Zustand → Global application state
> - React Query → Server state (caching, refetching)
>
> **4. Performance:**
> Optimize strategically:
> ```typescript
> // Memoize expensive components
> const ExpensiveList = React.memo(function ExpensiveList({ items }) {
>   return items.map(item => <ExpensiveItem item={item} />);
> });
> 
> // Memoize expensive calculations
> const sortedData = useMemo(() => {
>   return data.sort(compareFn);
> }, [data]);
> 
> // Memoize callbacks
> const handleClick = useCallback(() => {
>   doSomething(id);
> }, [id]);
> ```
>
> **5. Error Handling:**
> Use error boundaries for graceful degradation:
> ```typescript
> <ErrorBoundary fallback={<ErrorUI />}>
>   <FeatureComponent />
> </ErrorBoundary>
> ```
>
> **Real-World Example:**
>
> At [Company], we built a dashboard with 150+ components:
>
> **Structure:**
> - 40 UI primitives (Button, Input, Card, etc.)
> - 80 feature components (charts, tables, forms)
> - 30 shared components (layouts, navigation)
>
> **Benefits:**
> - Development speed: 60% faster (component reuse)
> - Bug rate: 70% lower (isolated components)
> - Bundle size: 40% smaller (code splitting per route)
> - Test coverage: 85% (unit tests per component)
>
> **Performance:**
> - Initial load: 1.2s (code splitting + lazy loading)
> - Lighthouse score: 95/100
> - Re-render optimization: React.memo on 30 expensive components
>
> **Key Insight:**
>
> Component-based architecture isn't just about splitting UI into pieces—it's about creating a sustainable system where:
> - Teams can work independently
> - Changes are isolated and safe
> - Code is reusable and testable
> - Performance is optimized per component
>
> The goal is building a component library that accelerates development while maintaining quality and performance."

---

### Follow-Up Questions

#### Q1: "How do you prevent prop drilling in deeply nested components?"

**Answer:**

> "Prop drilling occurs when you pass props through many intermediate components that don't use them:
>
> ```typescript
> // ❌ Prop drilling (5 levels deep)
> function App() {
>   const [user, setUser] = useState();
>   return <Layout user={user} />;
> }
> 
> function Layout({ user }) {
>   return <Sidebar user={user} />;
> }
> 
> function Sidebar({ user }) {
>   return <Menu user={user} />;
> }
> 
> function Menu({ user }) {
>   return <MenuItem user={user} />;
> }
> 
> function MenuItem({ user }) {
>   return <div>{user.name}</div>; // Finally used here!
> }
> ```
>
> **Solutions:**
>
> **1. Context API (Best for theme, auth, i18n):**
> ```typescript
> const UserContext = createContext();
> 
> function App() {
>   const [user, setUser] = useState();
>   
>   return (
>     <UserContext.Provider value={user}>
>       <Layout />  // No props!
>     </UserContext.Provider>
>   );
> }
> 
> function MenuItem() {
>   const user = useContext(UserContext); // Direct access
>   return <div>{user.name}</div>;
> }
> ```
>
> **2. Composition (Best for flexible layouts):**
> ```typescript
> function App() {
>   const [user, setUser] = useState();
>   
>   return (
>     <Layout>
>       <Sidebar>
>         <Menu>
>           <MenuItem user={user} />  // Direct prop, no drilling
>         </Menu>
>       </Sidebar>
>     </Layout>
>   );
> }
> ```
>
> **3. Component Composition with Children:**
> ```typescript
> function App() {
>   const [user, setUser] = useState();
>   
>   return (
>     <Layout
>       sidebar={
>         <Sidebar
>           menu={<Menu item={<MenuItem user={user} />} />}
>         />
>       }
>     />
>   );
> }
> ```
>
> **4. Global State (Redux, Zustand):**
> ```typescript
> function MenuItem() {
>   const user = useSelector(state => state.user);
>   return <div>{user.name}</div>;
> }
> ```
>
> **Decision Matrix:**
> - **1-2 levels deep:** Props (simple, clear)
> - **3-4 levels deep:** Context or Composition
> - **5+ levels deep:** Global state or rethink architecture
> - **Multiple features need data:** Global state
> - **Single feature, deep nesting:** Context
>
> **Performance Consideration:**
> Context causes all consumers to re-render when value changes. Mitigate with:
> ```typescript
> // Split contexts by change frequency
> <AuthContext.Provider value={user}>      // Changes rarely
>   <ThemeContext.Provider value={theme}>  // Changes rarely
>     <UIContext.Provider value={uiState}> // Changes often
>       <App />
>     </UIContext.Provider>
>   </ThemeContext.Provider>
> </AuthContext.Provider>
> ```
>
> At [Company], we used Context for auth and theme (rarely change), Redux for cart and user preferences (frequently accessed), and local state for UI interactions."

---

#### Q2: "How do you optimize component performance with 10,000+ items?"

**Answer:**

> "Rendering 10,000+ items requires several optimization techniques:
>
> **1. Virtual Scrolling (Most Important):**
> Only render visible items:
> ```typescript
> import { useVirtual } from 'react-virtual';
> 
> function ItemList({ items }) { // 10,000 items
>   const parentRef = useRef();
>   
>   const rowVirtualizer = useVirtual({
>     size: items.length,      // Total: 10,000
>     parentRef,
>     estimateSize: () => 50,  // Each item ~50px
>     overscan: 5              // Render 5 extra above/below viewport
>   });
>   
>   return (
>     <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
>       <div style={{ height: `${rowVirtualizer.totalSize}px` }}>
>         {rowVirtualizer.virtualItems.map(virtualRow => (
>           <div key={items[virtualRow.index].id}>
>             <Item item={items[virtualRow.index]} />
>           </div>
>         ))}
>       </div>
>     </div>
>   );
> }
> 
> // Result: Render only 15-20 items instead of 10,000!
> // Performance: 60 FPS scrolling
> ```
>
> **2. React.memo (Prevent Re-renders):**
> ```typescript
> const Item = React.memo(function Item({ item }) {
>   return (
>     <div className="item">
>       <h3>{item.name}</h3>
>       <p>{item.description}</p>
>     </div>
>   );
> });
> 
> // Without memo: Parent re-renders → ALL 10,000 items re-render
> // With memo: Only changed items re-render
> ```
>
> **3. Pagination:**
> ```typescript
> function ItemList({ items }) {
>   const [page, setPage] = useState(1);
>   const itemsPerPage = 50;
>   
>   const paginatedItems = items.slice(
>     (page - 1) * itemsPerPage,
>     page * itemsPerPage
>   );
>   
>   return (
>     <>
>       {paginatedItems.map(item => <Item item={item} />)}
>       <Pagination 
>         current={page}
>         total={Math.ceil(items.length / itemsPerPage)}
>         onChange={setPage}
>       />
>     </>
>   );
> }
> 
> // Result: Render only 50 items at a time
> ```
>
> **4. Windowing with react-window:**
> ```typescript
> import { FixedSizeList } from 'react-window';
> 
> function ItemList({ items }) {
>   return (
>     <FixedSizeList
>       height={600}
>       itemCount={items.length}
>       itemSize={50}
>       width="100%"
>     >
>       {({ index, style }) => (
>         <div style={style}>
>           <Item item={items[index]} />
>         </div>
>       )}
>     </FixedSizeList>
>   );
> }
> ```
>
> **5. Key Optimization:**
> ```typescript
> // ❌ Bad: Index as key (re-renders all on reorder)
> {items.map((item, index) => (
>   <Item key={index} item={item} />
> ))}
> 
> // ✅ Good: Stable ID as key (minimal re-renders)
> {items.map(item => (
>   <Item key={item.id} item={item} />
> ))}
> ```
>
> **6. Debounced Search/Filter:**
> ```typescript
> function ItemList({ items }) {
>   const [filter, setFilter] = useState('');
>   const [debouncedFilter, setDebouncedFilter] = useState('');
>   
>   useEffect(() => {
>     const timer = setTimeout(() => {
>       setDebouncedFilter(filter);
>     }, 300);
>     
>     return () => clearTimeout(timer);
>   }, [filter]);
>   
>   const filteredItems = useMemo(() => {
>     return items.filter(item => 
>       item.name.toLowerCase().includes(debouncedFilter.toLowerCase())
>     );
>   }, [items, debouncedFilter]);
>   
>   return (
>     <>
>       <input 
>         value={filter}
>         onChange={(e) => setFilter(e.target.value)}
>         placeholder="Search..."
>       />
>       <VirtualList items={filteredItems} />
>     </>
>   );
> }
> ```
>
> **Performance Comparison:**
>
> **Without optimization:**
> - Render time: 2000-3000ms ❌
> - Scroll FPS: 10-15 FPS ❌
> - Memory: 500 MB ❌
>
> **With virtual scrolling:**
> - Render time: 50-100ms ✅
> - Scroll FPS: 60 FPS ✅
> - Memory: 50 MB ✅
>
> **Real Example:**
>
> At [Company], we had an email client with 50,000 emails:
> - Implemented react-virtual for message list
> - Used React.memo for email items
> - Debounced search (300ms delay)
> - Result: Smooth 60 FPS scrolling, <100ms search response"

---

#### Q3: "How do you handle component testing?"

**Answer:**

> "Component testing is critical for maintainable applications. I follow a testing pyramid:
>
> **Testing Strategy:**
>
> ```
> E2E Tests (5%)           ← Few, expensive, slow
>      ↑
> Integration Tests (25%)  ← Test component interactions
>      ↑
> Unit Tests (70%)         ← Test individual components
> ```
>
> **1. Unit Tests (Presentational Components):**
>
> Test props → output, no side effects:
> ```typescript
> // Component
> function Button({ onClick, disabled, children }) {
>   return (
>     <button onClick={onClick} disabled={disabled}>
>       {children}
>     </button>
>   );
> }
> 
> // Tests
> import { render, screen, fireEvent } from '@testing-library/react';
> 
> describe('Button', () => {
>   it('renders children', () => {
>     render(<Button>Click Me</Button>);
>     expect(screen.getByText('Click Me')).toBeInTheDocument();
>   });
>   
>   it('calls onClick when clicked', () => {
>     const handleClick = jest.fn();
>     render(<Button onClick={handleClick}>Click</Button>);
>     
>     fireEvent.click(screen.getByText('Click'));
>     expect(handleClick).toHaveBeenCalledTimes(1);
>   });
>   
>   it('is disabled when disabled prop is true', () => {
>     render(<Button disabled>Click</Button>);
>     expect(screen.getByRole('button')).toBeDisabled();
>   });
> });
> ```
>
> **2. Integration Tests (Container Components):**
>
> Test with mocked dependencies:
> ```typescript
> // Component
> function UserProfile({ userId }) {
>   const [user, setUser] = useState(null);
>   
>   useEffect(() => {
>     fetchUser(userId).then(setUser);
>   }, [userId]);
>   
>   if (!user) return <div>Loading...</div>;
>   return <div>{user.name}</div>;
> }
> 
> // Test
> import { render, screen, waitFor } from '@testing-library/react';
> 
> jest.mock('./api', () => ({
>   fetchUser: jest.fn()
> }));
> 
> describe('UserProfile', () => {
>   it('displays user data after loading', async () => {
>     const mockUser = { id: '1', name: 'John' };
>     fetchUser.mockResolvedValue(mockUser);
>     
>     render(<UserProfile userId="1" />);
>     
>     expect(screen.getByText('Loading...')).toBeInTheDocument();
>     
>     await waitFor(() => {
>       expect(screen.getByText('John')).toBeInTheDocument();
>     });
>   });
> });
> ```
>
> **3. Testing Hooks:**
> ```typescript
> import { renderHook, act } from '@testing-library/react-hooks';
> 
> function useCounter() {
>   const [count, setCount] = useState(0);
>   const increment = () => setCount(c => c + 1);
>   return { count, increment };
> }
> 
> describe('useCounter', () => {
>   it('increments count', () => {
>     const { result } = renderHook(() => useCounter());
>     
>     expect(result.current.count).toBe(0);
>     
>     act(() => {
>       result.current.increment();
>     });
>     
>     expect(result.current.count).toBe(1);
>   });
> });
> ```
>
> **4. Snapshot Testing:**
> ```typescript
> it('matches snapshot', () => {
>   const { container } = render(<ProductCard product={mockProduct} />);
>   expect(container).toMatchSnapshot();
> });
> ```
>
> **Best Practices:**
>
> 1. **Test behavior, not implementation:**
> ```typescript
> // ❌ Bad: Testing implementation
> expect(component.state.count).toBe(5);
> 
> // ✅ Good: Testing behavior
> expect(screen.getByText('Count: 5')).toBeInTheDocument();
> ```
>
> 2. **Use data-testid sparingly:**
> ```typescript
> // ✅ Prefer semantic queries
> screen.getByRole('button', { name: 'Submit' });
> screen.getByLabelText('Email');
> screen.getByText('Welcome');
> 
> // ⚠️ Use data-testid only when necessary
> screen.getByTestId('submit-button');
> ```
>
> 3. **Mock external dependencies:**
> ```typescript
> jest.mock('./api');
> jest.mock('./analytics');
> ```
>
> **Coverage Targets:**
> - Presentational components: 90%+
> - Container components: 80%+
> - Hooks: 85%+
> - Overall: 80%+
>
> At [Company], we maintain 85% test coverage with:
> - 2000+ unit tests (avg 50ms each)
> - 300+ integration tests (avg 200ms each)
> - 50+ E2E tests (avg 5s each)
> - CI runs tests in parallel: Total 5 minutes"

---

## 5. Code Examples (When Applicable)

### Complete Component Library Example

```typescript
/**
 * DESIGN SYSTEM - TOKENS
 * Foundation for all components
 */
export const tokens = {
  colors: {
    primary: {
      50: '#e3f2fd',
      500: '#2196f3',
      700: '#1976d2',
    },
    secondary: {
      500: '#ff4081',
    },
    neutral: {
      100: '#f5f5f5',
      500: '#9e9e9e',
      900: '#212121',
    },
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
};


/**
 * BUTTON COMPONENT (Primitive)
 */
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      onClick,
      children,
      ...props
    },
    ref
  ) {
    const styles = {
      primary: {
        backgroundColor: tokens.colors.primary[500],
        color: '#ffffff',
        '&:hover': {
          backgroundColor: tokens.colors.primary[700],
        },
      },
      secondary: {
        backgroundColor: tokens.colors.neutral[100],
        color: tokens.colors.neutral[900],
        '&:hover': {
          backgroundColor: tokens.colors.neutral[500],
        },
      },
      danger: {
        backgroundColor: tokens.colors.error,
        color: '#ffffff',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: tokens.colors.primary[500],
        border: `1px solid ${tokens.colors.primary[500]}`,
      },
    };

    const sizes = {
      sm: {
        padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
        fontSize: tokens.typography.fontSize.sm,
      },
      md: {
        padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
        fontSize: tokens.typography.fontSize.md,
      },
      lg: {
        padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
        fontSize: tokens.typography.fontSize.lg,
      },
    };

    return (
      <button
        ref={ref}
        className={`btn btn-${variant} btn-${size}`}
        style={{
          ...styles[variant],
          ...sizes[size],
          width: fullWidth ? '100%' : 'auto',
          opacity: disabled || loading ? 0.5 : 1,
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: tokens.spacing.xs,
          border: 'none',
          borderRadius: tokens.borderRadius.md,
          fontWeight: tokens.typography.fontWeight.medium,
          transition: 'all 0.2s',
        }}
        disabled={disabled || loading}
        onClick={onClick}
        {...props}
      >
        {loading && <Spinner size="small" />}
        {icon && iconPosition === 'left' && icon}
        {children}
        {icon && iconPosition === 'right' && icon}
      </button>
    );
  }
);


/**
 * CARD COMPONENT (Composition)
 */
interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'flat';
  padding?: keyof typeof tokens.spacing;
}

export function Card({ 
  children, 
  variant = 'elevated',
  padding = 'md' 
}: CardProps) {
  const styles = {
    elevated: {
      boxShadow: tokens.shadows.md,
      border: 'none',
    },
    outlined: {
      boxShadow: 'none',
      border: `1px solid ${tokens.colors.neutral[500]}`,
    },
    flat: {
      boxShadow: 'none',
      border: 'none',
    },
  };

  return (
    <div
      className={`card card-${variant}`}
      style={{
        ...styles[variant],
        padding: tokens.spacing[padding],
        borderRadius: tokens.borderRadius.lg,
        backgroundColor: '#ffffff',
      }}
    >
      {children}
    </div>
  );
}

// Compound components
Card.Header = function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="card-header" style={{ marginBottom: tokens.spacing.md }}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="card-body">{children}</div>;
};

Card.Footer = function CardFooter({ children }: { children: React.ReactNode }) {
  return (
    <div 
      className="card-footer" 
      style={{ 
        marginTop: tokens.spacing.md,
        display: 'flex',
        gap: tokens.spacing.sm,
      }}
    >
      {children}
    </div>
  );
};


/**
 * USAGE EXAMPLE
 */
function ProductCard({ product }: { product: Product }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToCart = async () => {
    setIsLoading(true);
    await addToCart(product.id);
    setIsLoading(false);
  };

  return (
    <Card variant="elevated">
      <Card.Header>
        <img 
          src={product.image} 
          alt={product.name}
          style={{ width: '100%', borderRadius: tokens.borderRadius.md }}
        />
      </Card.Header>

      <Card.Body>
        <h3 style={{ margin: 0, marginBottom: tokens.spacing.sm }}>
          {product.name}
        </h3>
        <p style={{ 
          color: tokens.colors.neutral[500],
          fontSize: tokens.typography.fontSize.sm,
        }}>
          {product.description}
        </p>
        <div style={{ 
          fontSize: tokens.typography.fontSize.xl,
          fontWeight: tokens.typography.fontWeight.bold,
          marginTop: tokens.spacing.md,
        }}>
          ${product.price}
        </div>
      </Card.Body>

      <Card.Footer>
        <Button 
          variant="primary" 
          fullWidth
          loading={isLoading}
          onClick={handleAddToCart}
          icon={<CartIcon />}
        >
          Add to Cart
        </Button>
      </Card.Footer>
    </Card>
  );
}
```

---

## 6. Why & How Summary

### Why Component-Based Architecture Matters

**1. Maintainability:**
- Isolated changes (fix one component without touching others)
- Clear ownership (each component has a purpose)
- Self-documenting code (component structure reveals intent)
- Easy debugging (errors isolated to specific components)

**2. Reusability:**
- Write once, use everywhere (Button, Input, Card)
- Consistent UI/UX (same components everywhere)
- Faster development (40-60% speed increase)
- Less code duplication (DRY principle)

**3. Testability:**
- Unit test each component independently
- Mock dependencies easily
- High test coverage achievable (80-90%)
- Fast test execution (parallel testing)

**4. Scalability:**
- Parallel development (teams work on different components)
- Code splitting per component/route
- Lazy loading (load only what's needed)
- Performance optimization per component

**5. Developer Experience:**
- Fast onboarding (components are self-explanatory)
- Hot module replacement (instant feedback)
- Component libraries (Storybook for documentation)
- TypeScript integration (type-safe props)

---

### How Component-Based Architecture Works

**1. Component Lifecycle:**
```
Mount → Render → Update → Unmount
  ↓       ↓        ↓        ↓
useEffect hooks handle side effects at each stage
```

**2. Data Flow:**
```
Parent (state) 
  ↓ props
Child (render) 
  ↓ events
Parent (update state)
  ↓ new props
Child (re-render)
```

**3. Composition Pattern:**
```
Simple components → Composed into complex components
Button + Input + Card → Form → Dashboard → Application
```

**4. State Management:**
```
Local state (useState) → Component-specific
Context (createContext) → Shared with descendants
Global state (Redux) → Application-wide
```

**5. Performance Optimization:**
```
React.memo → Prevent unnecessary re-renders
useMemo → Memoize expensive calculations
useCallback → Memoize function references
Virtual scrolling → Render only visible items
```

---

### Quick Decision Matrix

**When to use Component-Based Architecture?**
✅ Always (it's the modern standard)

**How to structure components?**
- Small apps (<50 components): Flat structure
- Medium apps (50-200): Group by type/feature
- Large apps (200+): Feature modules with design system

**How to optimize performance?**
- <100 items: No optimization needed
- 100-1000 items: React.memo + pagination
- 1000+ items: Virtual scrolling + memoization

**How to manage state?**
- UI state: Local useState
- Shared state (2-3 components): Lift state up
- Deep nesting: Context API
- Application state: Redux/Zustand
- Server state: React Query/SWR

---

**END OF TOPIC 19: COMPONENT-BASED ARCHITECTURE**

**Next Topic:** MVC / MVVM in Frontend (Topic 20)





