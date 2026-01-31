# 59. Memoization Techniques

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Memoization** is a performance optimization technique that caches the results of expensive function calls or computations so they don't need to be recalculated when called with the same inputs. In React, it prevents unnecessary re-renders and recalculations, significantly improving application performance.

### What It Is:

```javascript
// Without memoization
function ExpensiveComponent({ data }) {
  const processedData = processData(data);  // Runs on EVERY render
  return <div>{processedData}</div>;
}

// With memoization
function ExpensiveComponent({ data }) {
  const processedData = useMemo(
    () => processData(data),
    [data]  // Only recalculates when data changes
  );
  return <div>{processedData}</div>;
}
```

**The Problem Without Memoization**:
```javascript
function ProductList({ products, sortBy, filterBy }) {
  // This runs on EVERY render, even if products haven't changed
  const sortedProducts = products.sort((a, b) => a.price - b.price);
  const filteredProducts = sortedProducts.filter(p => p.category === filterBy);
  
  // If parent re-renders due to unrelated state change,
  // products are sorted and filtered again (expensive!)
  
  return <div>{filteredProducts.map(...)}</div>;
}
```

**The Solution With Memoization**:
```javascript
function ProductList({ products, sortBy, filterBy }) {
  const processedProducts = useMemo(() => {
    const sorted = products.sort((a, b) => a.price - b.price);
    return sorted.filter(p => p.category === filterBy);
  }, [products, sortBy, filterBy]);  // Only recalculates when these change
  
  return <div>{processedProducts.map(...)}</div>;
}
```

### Core Memoization Tools in React:

#### 1. **useMemo** - Memoize expensive calculations
```javascript
const expensiveResult = useMemo(
  () => computeExpensiveValue(a, b),
  [a, b]  // Dependency array
);
```

#### 2. **useCallback** - Memoize function references
```javascript
const handleClick = useCallback(
  () => {
    doSomething(a, b);
  },
  [a, b]
);
```

#### 3. **React.memo** - Memoize entire components
```javascript
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});
// Only re-renders if props change
```

### When and Where Used:

**1. Expensive Calculations**:
```javascript
function DataVisualization({ data }) {
  // Parsing/transforming large datasets
  const chartData = useMemo(
    () => transformDataForChart(data),  // 200ms calculation
    [data]
  );
  
  return <Chart data={chartData} />;
}
```

**2. Preventing Child Re-renders**:
```javascript
function Parent() {
  const [count, setCount] = useState(0);
  
  // Without useCallback, creates new function every render
  // Child re-renders unnecessarily
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <ExpensiveChild onClick={handleClick} />
    </div>
  );
}

const ExpensiveChild = React.memo(({ onClick }) => {
  // Only re-renders if onClick reference changes
  return <button onClick={onClick}>Child Button</button>;
});
```

**3. Complex Filtering/Sorting**:
```javascript
function SearchResults({ items, query, filters }) {
  const filteredResults = useMemo(() => {
    return items
      .filter(item => item.name.includes(query))
      .filter(item => filters.every(f => item[f.key] === f.value))
      .sort((a, b) => a.score - b.score);
  }, [items, query, filters]);
  
  return <Results data={filteredResults} />;
}
```

**4. Reference Equality for Dependencies**:
```javascript
function Component({ config }) {
  // config is an object, new reference on every render
  // Without memoization, effect runs every render
  
  const stableConfig = useMemo(() => config, [JSON.stringify(config)]);
  
  useEffect(() => {
    fetchData(stableConfig);
  }, [stableConfig]);
}
```

### Real-World Impact:

**Before Memoization** (E-commerce product list):
```javascript
function ProductGrid({ products, filters }) {
  // Processes 10,000 products on every render
  const filtered = products.filter(matchesFilters);  // 150ms
  const sorted = filtered.sort(compareProducts);     // 50ms
  const paginated = sorted.slice(0, 20);             // 1ms
  
  return <Grid items={paginated} />;
}

// User types in search: 5 characters = 5 renders
// Total wasted time: 5 × (150ms + 50ms) = 1000ms (1 second lag!)
```

**After Memoization**:
```javascript
function ProductGrid({ products, filters }) {
  const processed = useMemo(() => {
    const filtered = products.filter(matchesFilters);  // 150ms
    const sorted = filtered.sort(compareProducts);     // 50ms
    return sorted.slice(0, 20);                        // 1ms
  }, [products, filters]);  // Only recalculates when products/filters change
  
  return <Grid items={processed} />;
}

// User types in search: 5 characters
// First character: 201ms (actual calculation)
// Next 4 characters: 0ms (cached)
// Total time: 201ms (5× faster!)
```

**Metrics**:
```
Without memoization:
- Search typing lag: 1000ms
- FPS during typing: 12 fps (janky)
- Users abandon search: 35%

With memoization:
- Search typing lag: 201ms
- FPS during typing: 58 fps (smooth)
- Users abandon search: 8%
```

### Role in Large-Scale Applications:

At FAANG scale, memoization is:
- **Essential for performance**: Apps with 1000+ components need selective memoization
- **Monitored continuously**: React DevTools Profiler tracks unnecessary renders
- **Applied strategically**: Not everything needs memoization (overhead exists)
- **Part of architecture**: Components designed with memoization in mind
- **A/B tested**: Measure impact on user engagement and performance

**Examples**:
- **Facebook**: News feed items are memoized to prevent re-rendering during scroll
- **Twitter**: Tweet components are memoized, only re-render when data changes
- **LinkedIn**: Complex profile calculations memoized to keep UI responsive
- **Airbnb**: Search results memoized during rapid filter changes

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### React Memoization Primitives

#### 1. **useMemo - Value Memoization**

**Purpose**: Cache the result of expensive computations.

**How It Works**:
```javascript
const memoizedValue = useMemo(
  () => computeExpensiveValue(a, b),
  [a, b]
);
```

**Under the Hood**:
1. React stores the computed value and dependency array
2. On re-render, compares new dependencies with stored dependencies using `Object.is`
3. If dependencies unchanged → return cached value
4. If dependencies changed → recompute and cache new value

**When React Recalculates**:
```javascript
const value = useMemo(() => compute(a, b), [a, b]);

// Recalculates when:
// - a changes (Object.is(oldA, newA) === false)
// - b changes (Object.is(oldB, newB) === false)

// Does NOT recalculate when:
// - Parent re-renders but a and b are same
// - Sibling state changes
// - Unrelated props change
```

**Dependency Comparison**:
```javascript
// Primitives: compared by value
const x = useMemo(() => compute(count), [count]);
// Recalculates when count value changes

// Objects: compared by reference
const y = useMemo(() => compute(obj), [obj]);
// Recalculates when obj reference changes (even if contents same)

const obj1 = { id: 1 };
const obj2 = { id: 1 };
Object.is(obj1, obj2);  // false - different references!
```

**Cost-Benefit Analysis**:
```javascript
// ❌ Over-memoization: Overhead > Benefit
const sum = useMemo(() => a + b, [a, b]);
// useMemo overhead: ~5-10μs
// Addition time: ~0.001μs
// Net loss: ~5μs per render

// ✅ Appropriate memoization: Benefit > Overhead
const processed = useMemo(() => {
  return items.map(x => expensiveTransform(x));  // 50ms
}, [items]);
// useMemo overhead: ~5-10μs
// Calculation time: 50,000μs
// Net gain: ~49,990μs per render
```

**Advanced Pattern - Factory Functions**:
```javascript
function useExpensiveCalculation(data) {
  // Memoize the factory function
  const calculator = useMemo(() => {
    const cache = new Map();
    
    return (key) => {
      if (cache.has(key)) return cache.get(key);
      
      const result = expensiveCompute(data, key);
      cache.set(key, result);
      return result;
    };
  }, [data]);
  
  return calculator;
}

// Usage
function Component({ data }) {
  const calculate = useExpensiveCalculation(data);
  
  return (
    <div>
      <div>{calculate('key1')}</div>
      <div>{calculate('key2')}</div>
      <div>{calculate('key1')}</div>  {/* Cached from internal Map */}
    </div>
  );
}
```

---

#### 2. **useCallback - Function Memoization**

**Purpose**: Cache function references to prevent child re-renders.

**How It Works**:
```javascript
const memoizedCallback = useCallback(
  () => {
    doSomething(a, b);
  },
  [a, b]
);
```

**Equivalent to**:
```javascript
const memoizedCallback = useMemo(
  () => {
    return () => {
      doSomething(a, b);
    };
  },
  [a, b]
);
```

**Why It Matters**:
```javascript
function Parent() {
  const [count, setCount] = useState(0);
  
  // ❌ New function every render
  const handleClick = () => {
    console.log('clicked');
  };
  
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <Child onClick={handleClick} />  {/* Child re-renders every time! */}
    </div>
  );
}

const Child = React.memo(({ onClick }) => {
  console.log('Child rendered');
  return <button onClick={onClick}>Click</button>;
});

// Output when parent count changes:
// "Child rendered" - unnecessary!
```

**With useCallback**:
```javascript
function Parent() {
  const [count, setCount] = useState(0);
  
  // ✅ Same function reference across renders
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <Child onClick={handleClick} />  {/* Child doesn't re-render */}
    </div>
  );
}

const Child = React.memo(({ onClick }) => {
  console.log('Child rendered');
  return <button onClick={onClick}>Click</button>;
});

// Output when parent count changes:
// (nothing - Child doesn't re-render!)
```

**Common Mistake - Stale Closures**:
```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  // ❌ Closure captures initial count (0)
  const handleClick = useCallback(() => {
    console.log(count);  // Always logs 0!
  }, []);  // Empty deps - never updates
  
  return <button onClick={handleClick}>Log Count</button>;
}

// Fix 1: Include count in dependencies
const handleClick = useCallback(() => {
  console.log(count);
}, [count]);  // Updates when count changes

// Fix 2: Use functional state update
const handleClick = useCallback(() => {
  setCount(prev => {
    console.log(prev);  // Always current
    return prev;
  });
}, []);  // Empty deps OK
```

**When useCallback is NOT Needed**:
```javascript
function Component() {
  // ❌ Unnecessary useCallback
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  
  return (
    <div>
      <button onClick={handleClick}>Click</button>
      {/* Button is a DOM element, not React component */}
      {/* DOM elements don't benefit from memoization */}
    </div>
  );
}

// ✅ Just use inline function
function Component() {
  return (
    <div>
      <button onClick={() => console.log('clicked')}>Click</button>
    </div>
  );
}
```

---

#### 3. **React.memo - Component Memoization**

**Purpose**: Prevent component re-renders when props haven't changed.

**Basic Usage**:
```javascript
const MyComponent = React.memo(function MyComponent({ name, age }) {
  console.log('Rendering MyComponent');
  return <div>{name} is {age} years old</div>;
});

// Component only re-renders if name or age change
```

**How It Works**:
1. React performs shallow comparison of props
2. If all props are same (by `Object.is`) → skip render, return cached result
3. If any prop changed → render normally

**Shallow Comparison Behavior**:
```javascript
const Component = React.memo(({ user, onClick }) => {
  return <div onClick={onClick}>{user.name}</div>;
});

// Re-renders when:
const user1 = { name: 'Alice' };
const user2 = { name: 'Alice' };
// Object.is(user1, user2) === false → re-renders

const onClick1 = () => {};
const onClick2 = () => {};
// Object.is(onClick1, onClick2) === false → re-renders

// Doesn't re-render when:
const sameUser = user1;
const sameOnClick = onClick1;
// Object.is(user1, sameUser) === true → no re-render
```

**Custom Comparison Function**:
```javascript
const MyComponent = React.memo(
  ({ user }) => {
    return <div>{user.name}</div>;
  },
  (prevProps, nextProps) => {
    // Return true if props are "equal" (skip render)
    // Return false if props changed (do render)
    return prevProps.user.id === nextProps.user.id;
  }
);

// Now only re-renders when user.id changes,
// ignores changes to other user properties
```

**Performance Considerations**:
```javascript
// ❌ Memoizing everything is wasteful
const TinyComponent = React.memo(({ text }) => {
  return <span>{text}</span>;
});

// React.memo overhead: ~10-20μs
// Component render time: ~5μs
// Net loss: ~5-15μs

// ✅ Memoize expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Complex rendering logic: 50ms
  return <ComplexVisualization data={data} />;
});

// React.memo overhead: ~10-20μs
// Component render time: 50,000μs
// Net gain: ~49,980μs when props unchanged
```

**React.memo vs PureComponent**:
```javascript
// Class component - PureComponent
class MyComponent extends React.PureComponent {
  render() {
    return <div>{this.props.name}</div>;
  }
}

// Functional component - React.memo
const MyComponent = React.memo(({ name }) => {
  return <div>{name}</div>;
});

// Both do shallow prop comparison
// React.memo is preferred for functional components
```

---

### Advanced Memoization Patterns

#### 1. **Memoizing Context Values**

**Problem**:
```javascript
function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  // ❌ Creates new object every render
  const value = { user, setUser, theme, setTheme };
  
  return (
    <AppContext.Provider value={value}>
      <ChildComponents />
    </AppContext.Provider>
  );
}

// Every consumer re-renders on every App render!
```

**Solution**:
```javascript
function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  // ✅ Memoize context value
  const value = useMemo(
    () => ({ user, setUser, theme, setTheme }),
    [user, theme]  // Only changes when user or theme changes
  );
  
  return (
    <AppContext.Provider value={value}>
      <ChildComponents />
    </AppContext.Provider>
  );
}
```

**Split Contexts for Better Performance**:
```javascript
// ❌ Single context - everything re-renders
const AppContext = createContext();

// ✅ Split contexts - only relevant consumers re-render
const UserContext = createContext();
const ThemeContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  const userValue = useMemo(() => ({ user, setUser }), [user]);
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);
  
  return (
    <UserContext.Provider value={userValue}>
      <ThemeContext.Provider value={themeValue}>
        <ChildComponents />
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}
```

---

#### 2. **Memoizing Selectors (Reselect Pattern)**

**Problem**:
```javascript
function ProductList({ products, filters }) {
  // Recalculates on every render, even if products/filters unchanged
  const filtered = products.filter(p => 
    filters.every(f => p[f.key] === f.value)
  );
  
  const sorted = filtered.sort((a, b) => a.price - b.price);
  
  return <List items={sorted} />;
}
```

**Solution with useMemo**:
```javascript
function ProductList({ products, filters }) {
  const processedProducts = useMemo(() => {
    const filtered = products.filter(p => 
      filters.every(f => p[f.key] === f.value)
    );
    return filtered.sort((a, b) => a.price - b.price);
  }, [products, filters]);
  
  return <List items={processedProducts} />;
}
```

**Advanced: Custom Memoization Hook**:
```javascript
function useDeepMemo(factory, deps) {
  const ref = useRef({ deps: undefined, value: undefined });
  
  // Deep comparison of dependencies
  const depsChanged = !ref.current.deps || 
    JSON.stringify(deps) !== JSON.stringify(ref.current.deps);
  
  if (depsChanged) {
    ref.current.deps = deps;
    ref.current.value = factory();
  }
  
  return ref.current.value;
}

// Usage
function Component({ config }) {
  const processed = useDeepMemo(
    () => expensiveProcess(config),
    [config]  // Deep comparison, not reference
  );
  
  return <div>{processed}</div>;
}
```

**Reselect Library Pattern**:
```javascript
import { createSelector } from 'reselect';

// Input selectors
const getProducts = (state) => state.products;
const getFilters = (state) => state.filters;

// Memoized selector
const getFilteredProducts = createSelector(
  [getProducts, getFilters],
  (products, filters) => {
    // Only recomputes when products or filters change
    return products.filter(p => 
      filters.every(f => p[f.key] === f.value)
    );
  }
);

// Usage
function ProductList() {
  const filteredProducts = useSelector(getFilteredProducts);
  return <List items={filteredProducts} />;
}
```

---

#### 3. **Memoizing Event Handlers with Parameters**

**Problem**:
```javascript
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          {todo.text}
          {/* ❌ Creates new function for each todo */}
          <button onClick={() => deleteTodo(todo.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

**Solution 1: Data Attributes**:
```javascript
function TodoList({ todos }) {
  const handleDelete = useCallback((e) => {
    const id = e.currentTarget.dataset.id;
    deleteTodo(id);
  }, []);
  
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          {todo.text}
          {/* ✅ Same function reference for all */}
          <button data-id={todo.id} onClick={handleDelete}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

**Solution 2: Memoized Child Components**:
```javascript
const TodoItem = React.memo(({ todo, onDelete }) => {
  return (
    <li>
      {todo.text}
      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </li>
  );
});

function TodoList({ todos }) {
  const handleDelete = useCallback((id) => {
    deleteTodo(id);
  }, []);
  
  return (
    <ul>
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} onDelete={handleDelete} />
      ))}
    </ul>
  );
}
```

**Solution 3: Factory Function Pattern**:
```javascript
function TodoList({ todos }) {
  // Create memoized delete handlers
  const deleteHandlers = useMemo(() => {
    const handlers = new Map();
    todos.forEach(todo => {
      handlers.set(todo.id, () => deleteTodo(todo.id));
    });
    return handlers;
  }, [todos]);
  
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          {todo.text}
          <button onClick={deleteHandlers.get(todo.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

---

#### 4. **Windowing/Virtualization with Memoization**

Large lists benefit from both virtualization and memoization:

```javascript
import { FixedSizeList } from 'react-window';

function VirtualizedList({ items }) {
  // Memoize row renderer
  const Row = useCallback(({ index, style }) => {
    const item = items[index];
    return (
      <div style={style}>
        <ExpensiveItemComponent item={item} />
      </div>
    );
  }, [items]);
  
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

const ExpensiveItemComponent = React.memo(({ item }) => {
  // Memoize expensive calculations per item
  const processedData = useMemo(() => {
    return expensiveTransform(item);
  }, [item]);
  
  return <div>{processedData}</div>;
});
```

---

### Common Pitfalls and Anti-Patterns

#### 1. **Over-Memoization**

```javascript
// ❌ Unnecessary memoization
function Component({ name }) {
  const greeting = useMemo(() => `Hello, ${name}!`, [name]);
  const count = useMemo(() => 1 + 1, []);
  
  return <div>{greeting} {count}</div>;
}

// ✅ Just compute directly
function Component({ name }) {
  const greeting = `Hello, ${name}!`;
  const count = 2;
  
  return <div>{greeting} {count}</div>;
}
```

**Rule of Thumb**: Only memoize if computation takes > 5ms or prevents re-renders.

---

#### 2. **Missing Dependencies**

```javascript
// ❌ Missing dependency
function Component({ items, threshold }) {
  const filtered = useMemo(
    () => items.filter(item => item.value > threshold),
    [items]  // Missing threshold!
  );
  
  // When threshold changes, filtered doesn't update
}

// ✅ Include all dependencies
const filtered = useMemo(
  () => items.filter(item => item.value > threshold),
  [items, threshold]
);
```

**Use ESLint plugin**: `eslint-plugin-react-hooks` catches missing dependencies.

---

#### 3. **Memoizing with Object/Array Dependencies**

```javascript
// ❌ Object/array in dependency array
function Component({ config }) {
  const result = useMemo(
    () => compute(config),
    [config]  // config is new object every render!
  );
}

// Parent:
<Component config={{ foo: 'bar' }} />  // New object every render

// ✅ Solution 1: Memoize in parent
function Parent() {
  const config = useMemo(() => ({ foo: 'bar' }), []);
  return <Component config={config} />;
}

// ✅ Solution 2: Use stable reference
const config = { foo: 'bar' };  // Outside component
function Parent() {
  return <Component config={config} />;
}

// ✅ Solution 3: Deep comparison (expensive)
function useDeepMemo(factory, deps) {
  const ref = useRef();
  const depsStr = JSON.stringify(deps);
  
  if (!ref.current || ref.current.depsStr !== depsStr) {
    ref.current = { depsStr, value: factory() };
  }
  
  return ref.current.value;
}
```

---

#### 4. **Premature Memoization**

```javascript
// ❌ Memoizing before measuring
function Component() {
  const value = useMemo(() => simpleCalculation(), []);
  const callback = useCallback(() => {}, []);
  const child = useMemo(() => <Child />, []);
  
  // Added memoization without profiling first
}

// ✅ Profile first, optimize second
// 1. Build feature without memoization
// 2. Use React DevTools Profiler to find slow components
// 3. Add memoization only where needed
// 4. Verify improvement with profiler
```

**Measure Before Optimizing**:
```javascript
console.time('calculation');
const result = expensiveCalculation();
console.timeEnd('calculation');
// "calculation: 0.23ms" → Don't memoize
// "calculation: 87.5ms" → Memoize
```

---

### Monitoring and Debugging

#### **React DevTools Profiler**

```javascript
function Component({ data }) {
  const processed = useMemo(() => {
    console.log('Computing processed data');
    return expensiveTransform(data);
  }, [data]);
  
  return <div>{processed}</div>;
}

// In React DevTools:
// 1. Open Profiler tab
// 2. Click record
// 3. Interact with app
// 4. Stop recording
// 5. See which components rendered and why
// 6. Check "Why did this render?" for each component
```

**Identifying Unnecessary Re-renders**:
```javascript
function Component({ items, onClick }) {
  useEffect(() => {
    console.log('Component rendered', {
      items,
      onClick
    });
  });
  
  return <div>{items.map(...)}</div>;
}

// Console output shows which props changed
```

**Why-Did-You-Render Library**:
```javascript
import whyDidYouRender from '@welldone-software/why-did-you-render';

whyDidYouRender(React, {
  trackAllPureComponents: true,
});

// Logs to console when components re-render unnecessarily
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: E-Commerce Product Filtering

**Problem**: 10,000 products, users apply multiple filters rapidly.

**Before Memoization**:
```javascript
function ProductList({ products, filters, sortBy }) {
  console.log('Filtering products...');
  
  // Runs on EVERY render (parent state changes, unrelated props, etc.)
  const filtered = products.filter(product => {
    return filters.every(filter => {
      return product[filter.key] === filter.value;
    });
  });
  
  const sorted = filtered.sort((a, b) => {
    return sortBy === 'price' 
      ? a.price - b.price 
      : a.name.localeCompare(b.name);
  });
  
  return (
    <div className="product-grid">
      {sorted.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// Performance metrics:
// - Filtering 10,000 products: 150ms
// - Sorting 2,000 results: 50ms
// - Total per render: 200ms
// - User types in search (5 keystrokes): 1000ms lag
// - Result: Janky, unresponsive UI
```

**After Memoization**:
```javascript
function ProductList({ products, filters, sortBy }) {
  // Only recalculates when products, filters, or sortBy change
  const processedProducts = useMemo(() => {
    console.log('Filtering products...');
    
    const filtered = products.filter(product => {
      return filters.every(filter => {
        return product[filter.key] === filter.value;
      });
    });
    
    return filtered.sort((a, b) => {
      return sortBy === 'price' 
        ? a.price - b.price 
        : a.name.localeCompare(b.name);
    });
  }, [products, filters, sortBy]);
  
  return (
    <div className="product-grid">
      {processedProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// Memoized ProductCard to prevent unnecessary re-renders
const ProductCard = React.memo(({ product }) => {
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
    </div>
  );
});

// Performance metrics:
// - First filter change: 200ms (actual calculation)
// - Subsequent re-renders (parent updates): 0ms (cached)
// - User types in search (5 keystrokes): 200ms total
// - Result: Smooth, responsive UI
```

**Results**:
```
Before Memoization:
- Time per render: 200ms
- 5 keystrokes: 1000ms lag
- FPS during interaction: 12 fps
- User abandonment: 32%

After Memoization:
- Time per render: 0ms (cached)
- 5 keystrokes: 200ms total
- FPS during interaction: 60 fps
- User abandonment: 9%
- Improvement: 80% faster, 71% fewer abandonments
```

---

### Example 2: Dashboard with Multiple Widgets

**Problem**: Dashboard with 10 widgets, each with expensive calculations. Any widget update causes all widgets to re-render.

**Before Memoization**:
```javascript
function Dashboard({ data, settings }) {
  return (
    <div className="dashboard">
      <RevenueWidget data={data.revenue} />
      <UsersWidget data={data.users} />
      <ConversionWidget data={data.conversions} />
      <GeographicWidget data={data.geographic} />
      <TimeSeriesWidget data={data.timeSeries} />
      {/* 5 more widgets... */}
    </div>
  );
}

function RevenueWidget({ data }) {
  // Runs on every Dashboard render
  const chartData = data.map(item => ({
    x: new Date(item.date),
    y: item.amount,
    label: formatCurrency(item.amount)
  }));
  
  const statistics = {
    total: chartData.reduce((sum, d) => sum + d.y, 0),
    average: chartData.reduce((sum, d) => sum + d.y, 0) / chartData.length,
    growth: calculateGrowth(chartData)
  };
  
  return (
    <div className="widget">
      <Chart data={chartData} />
      <Statistics stats={statistics} />
    </div>
  );
}

// When ANY widget's data changes, ALL widgets recalculate
// Result: 10 × 50ms = 500ms per update
```

**After Memoization**:
```javascript
function Dashboard({ data, settings }) {
  return (
    <div className="dashboard">
      <RevenueWidget data={data.revenue} />
      <UsersWidget data={data.users} />
      <ConversionWidget data={data.conversions} />
      <GeographicWidget data={data.geographic} />
      <TimeSeriesWidget data={data.timeSeries} />
    </div>
  );
}

// Memoize entire widget component
const RevenueWidget = React.memo(({ data }) => {
  // Memoize expensive calculations
  const chartData = useMemo(() => {
    return data.map(item => ({
      x: new Date(item.date),
      y: item.amount,
      label: formatCurrency(item.amount)
    }));
  }, [data]);
  
  const statistics = useMemo(() => {
    return {
      total: chartData.reduce((sum, d) => sum + d.y, 0),
      average: chartData.reduce((sum, d) => sum + d.y, 0) / chartData.length,
      growth: calculateGrowth(chartData)
    };
  }, [chartData]);
  
  return (
    <div className="widget">
      <Chart data={chartData} />
      <Statistics stats={statistics} />
    </div>
  );
});

// Now when revenue data changes:
// - Only RevenueWidget recalculates
// - Other 9 widgets skip render (React.memo)
// Result: 50ms instead of 500ms
```

**Results**:
```
Before Memoization:
- Single widget update: 500ms (all widgets recalculate)
- Dashboard feels sluggish
- Auto-refresh every 30s causes 500ms freeze

After Memoization:
- Single widget update: 50ms (only affected widget)
- Dashboard remains responsive
- Auto-refresh barely noticeable
- Improvement: 90% faster updates
```

---

### Example 3: Real-Time Chat with Message List

**Problem**: Thousands of messages, new messages arrive frequently, scrolling is janky.

**Before Memoization**:
```javascript
function ChatWindow({ messages, currentUser }) {
  return (
    <div className="chat-window">
      {messages.map(message => (
        <Message 
          key={message.id} 
          message={message}
          isOwn={message.userId === currentUser.id}
        />
      ))}
    </div>
  );
}

function Message({ message, isOwn }) {
  // Runs for ALL messages on every new message
  const formattedTime = new Date(message.timestamp).toLocaleTimeString();
  const displayName = message.user.firstName + ' ' + message.user.lastName;
  
  return (
    <div className={`message ${isOwn ? 'own' : 'other'}`}>
      <div className="message-header">
        <span className="name">{displayName}</span>
        <span className="time">{formattedTime}</span>
      </div>
      <div className="message-body">{message.text}</div>
    </div>
  );
}

// When new message arrives:
// - All 1000 previous messages re-render
// - Each recalculates formattedTime and displayName
// - Result: 1000 × 1ms = 1000ms freeze on new message
```

**After Memoization**:
```javascript
function ChatWindow({ messages, currentUser }) {
  // Memoize currentUser.id to prevent reference changes
  const currentUserId = useMemo(() => currentUser.id, [currentUser.id]);
  
  return (
    <div className="chat-window">
      {messages.map(message => (
        <Message 
          key={message.id} 
          message={message}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}

// Memoize entire Message component
const Message = React.memo(({ message, currentUserId }) => {
  // Memoize expensive formatting
  const formattedTime = useMemo(
    () => new Date(message.timestamp).toLocaleTimeString(),
    [message.timestamp]
  );
  
  const displayName = useMemo(
    () => `${message.user.firstName} ${message.user.lastName}`,
    [message.user]
  );
  
  const isOwn = message.userId === currentUserId;
  
  return (
    <div className={`message ${isOwn ? 'own' : 'other'}`}>
      <div className="message-header">
        <span className="name">{displayName}</span>
        <span className="time">{formattedTime}</span>
      </div>
      <div className="message-body">{message.text}</div>
    </div>
  );
});

// When new message arrives:
// - Previous messages: React.memo prevents re-render (props unchanged)
// - New message: Renders once
// - Result: ~2ms per new message (vs 1000ms before)
```

**Enhanced with Virtualization**:
```javascript
import { FixedSizeList } from 'react-window';

function ChatWindow({ messages, currentUserId }) {
  // Memoize row renderer
  const Row = useCallback(({ index, style }) => {
    const message = messages[index];
    return (
      <div style={style}>
        <Message message={message} currentUserId={currentUserId} />
      </div>
    );
  }, [messages, currentUserId]);
  
  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

**Results**:
```
Before Memoization:
- New message latency: 1000ms
- Scrolling FPS: 15 fps (janky)
- Messages visible: 1000 (all render)

After Memoization + Virtualization:
- New message latency: 2ms
- Scrolling FPS: 60 fps (smooth)
- Messages visible: 10-15 (only visible render)
- Improvement: 500× faster message handling
```

---

### Example 4: Form with Complex Validation

**Problem**: Form with 20 fields, each with validation. Any field change triggers re-validation of all fields.

**Before Memoization**:
```javascript
function RegistrationForm({ initialData }) {
  const [formData, setFormData] = useState(initialData);
  
  // Runs on EVERY state change (any field)
  const errors = {
    email: validateEmail(formData.email),
    password: validatePassword(formData.password),
    confirmPassword: validateConfirmPassword(
      formData.password, 
      formData.confirmPassword
    ),
    phone: validatePhone(formData.phone),
    address: validateAddress(formData.address),
    // ... 15 more fields
  };
  
  const isValid = Object.values(errors).every(error => !error);
  
  return (
    <form>
      <input 
        value={formData.email}
        onChange={e => setFormData({ ...formData, email: e.target.value })}
      />
      {errors.email && <span>{errors.email}</span>}
      {/* 19 more fields... */}
    </form>
  );
}

// User types in email field:
// - 5 keystrokes = 5 re-renders
// - Each render: validates all 20 fields (20 × 5ms = 100ms)
// - Total: 500ms lag for 5 characters
```

**After Memoization**:
```javascript
function RegistrationForm({ initialData }) {
  const [formData, setFormData] = useState(initialData);
  
  // Memoize individual field validations
  const emailError = useMemo(
    () => validateEmail(formData.email),
    [formData.email]
  );
  
  const passwordError = useMemo(
    () => validatePassword(formData.password),
    [formData.password]
  );
  
  const confirmPasswordError = useMemo(
    () => validateConfirmPassword(formData.password, formData.confirmPassword),
    [formData.password, formData.confirmPassword]
  );
  
  // ... memoize other validations
  
  // Memoize errors object
  const errors = useMemo(() => ({
    email: emailError,
    password: passwordError,
    confirmPassword: confirmPasswordError,
    // ... other errors
  }), [emailError, passwordError, confirmPasswordError /* ... */]);
  
  // Memoize isValid
  const isValid = useMemo(
    () => Object.values(errors).every(error => !error),
    [errors]
  );
  
  // Memoize field change handlers
  const handleEmailChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, email: e.target.value }));
  }, []);
  
  return (
    <form>
      <input value={formData.email} onChange={handleEmailChange} />
      {emailError && <span>{emailError}</span>}
      {/* ... */}
    </form>
  );
}
```

**Advanced: Field-Level Memoization**:
```javascript
const FormField = React.memo(({ 
  name, 
  value, 
  onChange, 
  validate 
}) => {
  // Only validates when value changes
  const error = useMemo(() => validate(value), [value, validate]);
  
  return (
    <div>
      <input value={value} onChange={onChange} />
      {error && <span className="error">{error}</span>}
    </div>
  );
});

function RegistrationForm() {
  const [formData, setFormData] = useState(initialData);
  
  // Memoize validators (functions as dependencies)
  const validateEmail = useCallback((value) => {
    return !value.includes('@') ? 'Invalid email' : null;
  }, []);
  
  const handleChange = useCallback((name) => (e) => {
    setFormData(prev => ({ ...prev, [name]: e.target.value }));
  }, []);
  
  return (
    <form>
      <FormField
        name="email"
        value={formData.email}
        onChange={handleChange('email')}
        validate={validateEmail}
      />
      {/* Other fields... */}
    </form>
  );
}
```

**Results**:
```
Before Memoization:
- Per keystroke: 100ms (validates all 20 fields)
- 5 keystrokes: 500ms lag
- Form feels unresponsive

After Memoization:
- Per keystroke: 5ms (validates only changed field)
- 5 keystrokes: 25ms total
- Form feels instant
- Improvement: 95% faster validation
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question**: "How do you use memoization to optimize React applications?"

**Strong Answer**:

"I use memoization strategically to prevent unnecessary recalculations and re-renders, but I always profile first before optimizing—premature memoization can actually hurt performance due to overhead.

**My approach has three levels**:

**First, component-level memoization with React.memo**. I wrap expensive components that receive the same props frequently. For example, in a dashboard I built with 12 widgets, each widget was independently expensive to render—50ms each. Without React.memo, any state change re-rendered all 12 widgets, causing 600ms freezes. After wrapping each widget with React.memo, only widgets with changed data re-rendered, dropping update time from 600ms to 50ms—a 92% improvement.

**The key is understanding React.memo does shallow prop comparison**. If you pass new object or function references every render, React.memo is useless. This is where useCallback and useMemo come in.

**Second, useCallback for function references**. When passing callbacks to memoized components, I use useCallback to maintain stable function references. On an e-commerce product list with 1000 items, each product card had an 'Add to Cart' handler. Initially, we created new functions for each product on every render. After memoizing the parent callback with useCallback and passing the same reference to all cards, we eliminated 1000 unnecessary re-renders per interaction.

**Common mistake I see**: Using useCallback without also memoizing the child component with React.memo. useCallback alone doesn't prevent re-renders—the child must be memoized to benefit from stable function references.

**Third, useMemo for expensive calculations**. I use this for data transformations that are computationally expensive—typically > 5ms. For a filtering feature with 10,000 products, each filter operation took 150ms. Wrapping it in useMemo with products and filters as dependencies meant we only recalculated when those values actually changed, not on every render. This transformed a janky typing experience (1 second lag) into a smooth one (200ms one-time cost).

**When I DON'T memoize**:

1. **Simple calculations**: String concatenation, basic arithmetic—the memoization overhead (5-10μs) exceeds the calculation time.

2. **Components that change frequently**: If props change on most renders, React.memo's comparison is pure overhead with no benefit.

3. **Until profiled**: I use React DevTools Profiler to identify slow components first. Premature optimization wastes time and adds complexity.

**Real debugging story**: We had a context provider where the value was recreated every render—a new object. This caused every context consumer to re-render on every provider render, even if the actual data was unchanged. The fix was simple: wrap the context value in useMemo. This single change eliminated 90% of unnecessary re-renders across 40+ components.

**Advanced pattern I use**: Custom hooks for complex memoization. For example, a `useFilteredAndSorted` hook that memoizes multiple transformation steps and only recalculates when dependencies change. This keeps components clean while centralizing expensive logic.

**Monitoring**: In production, we track render counts and component timing with performance monitoring. We alert if any component consistently renders > 16ms (60fps threshold) or if render counts spike unexpectedly—both indicate memoization opportunities.

**The key insight**: Memoization is about preventing wasted work. Profile first, identify expensive operations or frequent re-renders, then apply the appropriate memoization tool. Measure the impact—sometimes the overhead exceeds the benefit. At scale, strategic memoization can improve FPS from 15 to 60, reduce interaction latency from 1 second to 200ms, and directly impact user engagement and conversion metrics."

---

### Likely Follow-Up Questions

#### 1. **"When should you NOT use memoization?"**

**Answer**:

"There are several scenarios where memoization hurts more than it helps:

**1. Simple, fast calculations**:
```javascript
// ❌ Memoization overhead > calculation time
const sum = useMemo(() => a + b, [a, b]);

// Memoization overhead: ~5-10μs
// Addition: ~0.001μs
// Net loss: ~5μs per render
```

String concatenation, basic arithmetic, simple ternaries—these are so fast that the memoization machinery is slower than just recalculating.

**2. Props that change frequently**:
```javascript
const ExpensiveComponent = React.memo(({ timestamp }) => {
  return <div>{timestamp}</div>;
});

// If timestamp changes every render (e.g., live clock),
// React.memo does expensive comparison every time,
// then renders anyway. Pure overhead, zero benefit.
```

If props change on 90%+ of renders, you're paying for comparison without gaining skipped renders.

**3. Components that are already fast**:
```javascript
// ❌ Memoizing trivial component
const Span = React.memo(({ text }) => {
  return <span>{text}</span>;
});

// This component renders in ~5μs
// React.memo overhead: ~10μs
// Net loss: ~5μs
```

Profile first. If a component renders in < 10ms and isn't rendered frequently, don't memoize.

**4. When it adds complexity without benefit**:
```javascript
// ❌ Over-engineered
function Component({ items }) {
  const mappedItems = useMemo(() => items.map(x => x), [items]);
  const filteredItems = useMemo(() => mappedItems.filter(x => x), [mappedItems]);
  const slicedItems = useMemo(() => filteredItems.slice(0, 10), [filteredItems]);
  
  // Code is harder to read, debug, and maintain
  // Benefit might be negligible
}

// ✅ Simple and clear
function Component({ items }) {
  const displayItems = items.filter(x => x).slice(0, 10);
  // Profile shows this is fast enough, so keep it simple
}
```

**5. During initial development**:
Don't prematurely optimize. Build the feature first, make it work correctly, then profile to find actual bottlenecks. I've seen developers spend hours memoizing everything, only to discover the real bottleneck was an API call or a different component entirely.

**My decision framework**:
```
Profile first → Is component slow? (> 10ms)
                └─ No → Don't memoize
                └─ Yes → Are props stable?
                         └─ No → Don't memoize
                         └─ Yes → Will it be rendered frequently?
                                  └─ No → Don't memoize
                                  └─ Yes → Memoize and measure impact
```

**Real example**: On a project, someone memoized every single component and callback in a feature—50+ useMemo/useCallback calls. Profiling showed the feature was actually slower after memoization due to comparison overhead. We removed 80% of the memoization, and performance improved by 15%. The lesson: measure, don't guess."

---

#### 2. **"What's the difference between useMemo and useCallback?"**

**Answer**:

"They're related but serve different purposes: useMemo caches a computed value, useCallback caches a function reference.

**useMemo**: Memoizes the result of a calculation
```javascript
const expensiveResult = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

// Returns: the computed value
// Recalculates: when a or b changes
// Use case: Avoid expensive recalculations
```

**useCallback**: Memoizes the function itself
```javascript
const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]);

// Returns: the function
// Recalculates: when a or b changes
// Use case: Stable function reference for child components
```

**They're actually related**:
```javascript
// These are equivalent:
const callback = useCallback(
  () => doSomething(a, b),
  [a, b]
);

const callback = useMemo(
  () => () => doSomething(a, b),
  [a, b]
);
// useCallback is just syntactic sugar
```

**When to use useMemo**:
```javascript
// Expensive data transformation
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.value - b.value);
}, [data]);

// Complex calculation
const statistics = useMemo(() => {
  return {
    mean: calculateMean(data),
    median: calculateMedian(data),
    stdDev: calculateStdDev(data)
  };
}, [data]);
```

**When to use useCallback**:
```javascript
// Passing callback to memoized child
const Child = React.memo(({ onClick }) => {
  return <button onClick={onClick}>Click</button>;
});

function Parent() {
  // Without useCallback: new function every render, Child re-renders
  // With useCallback: same function reference, Child skips render
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  
  return <Child onClick={handleClick} />;
}

// Callback in dependency array of useEffect
function Component({ userId }) {
  const fetchUser = useCallback(async () => {
    const user = await api.getUser(userId);
    setUser(user);
  }, [userId]);
  
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);  // Stable reference prevents infinite loops
}
```

**Common mistake**:
```javascript
// ❌ Using useCallback alone doesn't prevent re-renders
function Parent() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  
  return <Child onClick={handleClick} />;
}

// Child is NOT memoized, so it re-renders anyway
function Child({ onClick }) {
  return <button onClick={onClick}>Click</button>;
}

// ✅ Both are needed
const Child = React.memo(({ onClick }) => {
  return <button onClick={onClick}>Click</button>;
});
```

**Rule of thumb**:
- useMemo: "I'm calculating something expensive, cache the result"
- useCallback: "I'm passing this function to a child, keep the reference stable"

**Memory consideration**: Both add memory overhead (storing cached values). Don't memoize trivial values or functions that are only used once."

---

#### 3. **"How do you debug memoization issues in production?"**

**Answer**:

"Debugging memoization issues requires a multi-layered approach from development through production.

**Development - React DevTools Profiler**:

This is my primary tool. I record a profiling session during the problematic interaction, then analyze:

1. **Flamegraph view**: Shows which components rendered and how long each took. I look for:
   - Components that render repeatedly when they shouldn't
   - Components with high render duration
   - Cascading re-renders (parent triggers children unnecessarily)

2. **Ranked view**: Sorts components by render time. Immediately shows most expensive components.

3. **Component details**: For each render, shows:
   - Why did this render? (Props changed, state changed, parent rendered)
   - Which props changed?
   - How long did it take?

**Example**: On a dashboard, Profiler showed a widget re-rendering on every parent update despite unchanged props. Digging in, the parent was passing `config={{ theme: 'dark' }}` inline—new object every render. Fix: memoize the config object.

**Development - Why Did You Render**:

For deeper analysis, I use the `@welldone-software/why-did-you-render` library:

```javascript
import whyDidYouRender from '@welldone-software/why-did-you-render';

if (process.env.NODE_ENV === 'development') {
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    logOnDifferentValues: true,
  });
}
```

This logs to console whenever:
- A component wrapped in React.memo re-renders despite 'equal' props
- Props change due to new object/function references

**Console instrumentation**:

I add temporary logging to track renders:

```javascript
function Component({ data, onClick }) {
  useEffect(() => {
    console.log('Component rendered', {
      dataRef: data,
      onClickRef: onClick,
      dataString: JSON.stringify(data)
    });
  });
  
  return <div>...</div>;
}
```

This shows which props are changing and whether it's reference vs value changes.

**Production - Performance Monitoring**:

We use instrumentation to track render metrics in production:

```javascript
function useRenderTracking(componentName) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());
  
  useEffect(() => {
    renderCount.current++;
    const renderTime = performance.now() - startTime.current;
    
    // Send to analytics
    analytics.track('component_render', {
      component: componentName,
      renderCount: renderCount.current,
      renderTime,
      url: window.location.pathname
    });
    
    // Alert on excessive renders
    if (renderCount.current > 10 && renderTime > 100) {
      logger.warn(`${componentName} rendering excessively`, {
        renderCount: renderCount.current,
        renderTime
      });
    }
    
    startTime.current = performance.now();
  });
}

// Usage
function ExpensiveComponent({ data }) {
  useRenderTracking('ExpensiveComponent');
  // ... component logic
}
```

**Production - Error Boundaries for Memoization Bugs**:

Memoization can cause stale data bugs. I add error boundaries with detailed logging:

```javascript
class MemoizationErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    if (error.message.includes('stale') || error.message.includes('undefined')) {
      logger.error('Potential memoization bug', {
        error: error.message,
        component: info.componentStack,
        props: this.props
      });
    }
  }
  
  render() {
    return this.props.children;
  }
}
```

**Common issues I've debugged**:

**Issue 1: Stale closures**
```javascript
// Bug: count is always 0 in callback
const [count, setCount] = useState(0);
const callback = useCallback(() => {
  console.log(count);  // Always 0!
}, []);  // Missing count in deps

// Fix detected by:
// - Why Did You Render warns about missing dependencies
// - ESLint react-hooks/exhaustive-deps rule
```

**Issue 2: Object props killing React.memo**
```javascript
// Bug: Child re-renders on every parent render
<Child config={{ theme: 'dark' }} />  // New object every render

// Fix detected by:
// - React DevTools shows 'props changed: config'
// - Why Did You Render shows config reference changed
```

**Issue 3: Over-memoization causing memory leaks**
```javascript
// Bug: Memoizing huge datasets
const hugeData = useMemo(() => {
  return generateHugeDataset();  // 50MB in memory
}, []);

// Fix detected by:
// - Chrome DevTools Memory Profiler shows growing heap
// - Component never unmounts, data never released
```

**My debugging workflow**:
1. Reproduce issue in development
2. Profile with React DevTools
3. Add console logging to track renders
4. Use Why Did You Render for deeper analysis
5. Fix and verify improvement in Profiler
6. Add production monitoring to prevent regression
7. Monitor dashboards for anomalies post-deploy

**Real production incident**: Our product list page was slow for users with large carts (100+ items). Production metrics showed the component was rendering 50+ times per page load. DevTools profiling revealed the cart context value wasn't memoized, causing all cart consumers to re-render on every cart action. Fix: memoize the context value, reducing renders from 50 to 2. Response time improved from 2.5s to 400ms."

---

#### 4. **"How do you handle memoization with deeply nested objects?"**

**Answer**:

"Deep objects are tricky for memoization because React uses shallow comparison (Object.is), which compares references, not deep values. I handle this with several strategies:

**Problem illustration**:
```javascript
function Component({ user }) {
  const processedUser = useMemo(() => {
    return expensiveProcess(user);
  }, [user]);
  
  // user is { id: 1, profile: { name: 'Alice', settings: { ... } } }
  // Even if deep values are unchanged, new reference = recalculate
}

// Parent:
<Component user={{ id: 1, profile: { name: 'Alice' } }} />
// New object every render, useMemo always recalculates
```

**Solution 1: Memoize in parent (preferred)**:
```javascript
function Parent() {
  const [userId, setUserId] = useState(1);
  
  // Memoize the user object
  const user = useMemo(() => ({
    id: userId,
    profile: { name: 'Alice', settings: { theme: 'dark' } }
  }), [userId]);
  
  return <Component user={user} />;
}

// Now Component receives same reference when userId unchanged
```

**Solution 2: Extract primitive values**:
```javascript
// Instead of passing entire object:
<Component user={user} />

// Pass only needed primitive values:
<Component 
  userId={user.id} 
  userName={user.profile.name}
  userTheme={user.profile.settings.theme}
/>

// Primitives are compared by value, not reference
```

**Solution 3: Deep comparison (expensive, last resort)**:
```javascript
function useDeepMemo(factory, deps) {
  const ref = useRef();
  const signalRef = useRef(0);
  
  const depsJSON = JSON.stringify(deps);
  
  if (!ref.current || ref.current.depsJSON !== depsJSON) {
    ref.current = {
      depsJSON,
      value: factory()
    };
  }
  
  return ref.current.value;
}

// Usage:
const processedUser = useDeepMemo(
  () => expensiveProcess(user),
  [user]  // Deep comparison via JSON.stringify
);

// WARNING: JSON.stringify is itself expensive (1-5ms for large objects)
// Only use for objects that change infrequently
```

**Solution 4: Hash-based comparison**:
```javascript
import { hash } from 'object-hash';

function useHashMemo(factory, deps) {
  const ref = useRef();
  
  const depsHash = hash(deps);
  
  if (!ref.current || ref.current.depsHash !== depsHash) {
    ref.current = {
      depsHash,
      value: factory()
    };
  }
  
  return ref.current.value;
}

// Faster than JSON.stringify for large objects
// More reliable (handles functions, circular refs, etc.)
```

**Solution 5: Immutable data structures**:
```javascript
import { Map } from 'immutable';

function Parent() {
  const [user, setUser] = useState(Map({
    id: 1,
    profile: Map({
      name: 'Alice',
      settings: Map({ theme: 'dark' })
    })
  }));
  
  // When updating:
  const updateTheme = (theme) => {
    // Creates new Map only for changed path
    setUser(prevUser => 
      prevUser.setIn(['profile', 'settings', 'theme'], theme)
    );
  };
  
  // Child receives new reference only when data actually changes
  return <Component user={user} />;
}
```

**Solution 6: Selector pattern (Redux-style)**:
```javascript
// Define selectors
const selectUserId = (user) => user.id;
const selectUserName = (user) => user.profile.name;
const selectUserSettings = (user) => user.profile.settings;

function Component({ user }) {
  // Memoize selected slices
  const userId = useMemo(() => selectUserId(user), [user]);
  const userName = useMemo(() => selectUserName(user), [user]);
  const settings = useMemo(() => selectUserSettings(user), [user]);
  
  // Further memoization based on slices
  const processed = useMemo(() => {
    return expensiveProcess(userId, userName);
  }, [userId, userName]);  // Only recalculates when these change
  
  return <div>{processed}</div>;
}
```

**My preference hierarchy**:
1. **Memoize in parent** - prevents problem at source
2. **Pass primitives** - simplest, most reliable
3. **Selector pattern** - good for complex state
4. **Immutable data** - best for large apps, but adds dependency
5. **Deep comparison** - last resort, expensive

**Real-world example**: E-commerce site with complex product objects (100+ properties). Initially, we passed entire product object to components, causing constant re-renders. Solution: created selectors that extracted only needed properties (id, name, price, image). Memoized based on these primitives. Reduced re-renders by 90% and improved scroll FPS from 20 to 58.

**Key insight**: The best solution is to not create the problem—design your state shape and prop passing to minimize deep object dependencies."

---

#### 5. **"How does memoization affect garbage collection and memory?"**

**Answer**:

"Memoization trades memory for speed—you cache results to avoid recalculation, but that cache consumes memory. I manage this trade-off carefully in production.

**How memoization affects memory**:

**1. useMemo stores the computed value**:
```javascript
const hugeArray = useMemo(() => {
  return new Array(1000000).fill(expensiveObject);
}, []);

// This array stays in memory for component lifetime
// If component never unmounts: 1M objects in memory permanently
```

**2. useCallback stores the function**:
```javascript
const callback = useCallback(() => {
  // Function and its closure stay in memory
  const largeData = capturedFromScope;
  return process(largeData);
}, []);

// Function + closure variables stay in memory
```

**3. React.memo stores previous props**:
```javascript
const Component = React.memo(({ hugeData }) => {
  return <div>...</div>;
});

// React keeps previous props to compare with next props
// hugeData is kept in memory between renders
```

**Memory implications**:

**Good memoization** (memory cost < performance gain):
```javascript
// Memoizing 10KB processed data to avoid 100ms recalculation
const processedData = useMemo(() => {
  return expensiveTransform(data);  // 100ms, result is 10KB
}, [data]);

// Cost: 10KB memory
// Benefit: Save 100ms per render
// If rendered 10 times: 1 second saved for 10KB
// Good trade-off ✅
```

**Bad memoization** (memory cost > performance gain):
```javascript
// Memoizing 50MB cached data to avoid 5ms recalculation
const cachedData = useMemo(() => {
  return data.map(x => x);  // 5ms, result is 50MB
}, [data]);

// Cost: 50MB memory
// Benefit: Save 5ms per render
// Bad trade-off ❌
```

**Garbage collection concerns**:

**Issue 1: Memoized values prevent GC**:
```javascript
function Component({ items }) {
  // items has 1M objects
  const processed = useMemo(() => {
    return items.map(item => processItem(item));
  }, [items]);
  
  // Even if items becomes empty array, old processed array
  // stays in memory until component re-renders with new items
}
```

**Issue 2: Closures capturing large objects**:
```javascript
const [hugeState, setHugeState] = useState(generateHugeData());

const callback = useCallback(() => {
  console.log(hugeState.length);
}, [hugeState]);

// callback captures entire hugeState in closure
// hugeState can't be garbage collected even if unused elsewhere
```

**Mitigation strategies**:

**1. Memoize only what's expensive**:
```javascript
// ❌ Memoizing everything
const a = useMemo(() => x + y, [x, y]);
const b = useMemo(() => str.toUpperCase(), [str]);
const c = useMemo(() => arr.length, [arr]);

// ✅ Only expensive operations
const expensive = useMemo(() => {
  return items.map(x => expensiveTransform(x));  // 50ms
}, [items]);
```

**2. Clear memoized values when not needed**:
```javascript
function Component({ showDetails }) {
  const expensiveData = useMemo(() => {
    if (!showDetails) return null;  // Don't compute if not needed
    return computeExpensiveData();
  }, [showDetails]);
  
  // When showDetails is false, expensiveData is null (no memory cost)
}
```

**3. Use refs for mutable cached values**:
```javascript
function Component({ items }) {
  const cache = useRef(new Map());
  
  // Cache results but allow GC of unused entries
  const getProcessed = (item) => {
    if (cache.current.has(item.id)) {
      return cache.current.get(item.id);
    }
    
    const processed = expensiveProcess(item);
    cache.current.set(item.id, processed);
    
    // Limit cache size to prevent unbounded growth
    if (cache.current.size > 100) {
      const firstKey = cache.current.keys().next().value;
      cache.current.delete(firstKey);
    }
    
    return processed;
  };
  
  return <div>{items.map(item => getProcessed(item))}</div>;
}
```

**4. Profile memory usage**:
```javascript
// Development tool to track memory
function useMemoryProfile(componentName) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const before = performance.memory?.usedJSHeapSize || 0;
      
      return () => {
        const after = performance.memory?.usedJSHeapSize || 0;
        const diff = after - before;
        
        if (diff > 10 * 1024 * 1024) {  // > 10MB
          console.warn(`${componentName} leaked ${diff / 1024 / 1024}MB`);
        }
      };
    }
  }, [componentName]);
}
```

**Production memory monitoring**:
```javascript
// Track heap size in production
setInterval(() => {
  if (performance.memory) {
    const heapSize = performance.memory.usedJSHeapSize / 1024 / 1024;
    
    if (heapSize > 500) {  // > 500MB
      logger.warn('High memory usage', {
        heapSize,
        url: window.location.pathname
      });
    }
    
    analytics.track('memory_usage', { heapSize });
  }
}, 60000);  // Every minute
```

**Real production incident**: We memoized a data transformation that processed 100K records into a 200MB array. The array persisted for the page lifetime. Users with multiple tabs open consumed 2GB+ memory, causing browser crashes. Fix: paginate the data, only memoize visible 20 records (4MB instead of 200MB). Memory usage dropped 98%, no more crashes.

**Key principle**: Memoization is a trade-off. Always profile both performance AND memory. If you're caching 100MB to save 10ms, you're doing it wrong."

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Complete Memoization Patterns Library

```javascript
// ============================================
// 1. BASIC MEMOIZATION HOOKS
// ============================================

/**
 * Deep comparison memoization
 * Use when dependencies are objects that change by value, not reference
 */
import { useRef } from 'react';

export function useDeepMemo(factory, deps) {
  const ref = useRef();
  const depsJSON = JSON.stringify(deps);
  
  if (!ref.current || ref.current.depsJSON !== depsJSON) {
    ref.current = {
      depsJSON,
      value: factory()
    };
  }
  
  return ref.current.value;
}

// Usage:
const processed = useDeepMemo(
  () => expensiveTransform(config),
  [config]  // Object compared by deep value
);

/**
 * Debounced memoization
 * Delays recalculation until value stabilizes
 */
export function useDebouncedMemo(factory, deps, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(() => factory());
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(factory());
    }, delay);
    
    return () => clearTimeout(timer);
  }, deps);
  
  return debouncedValue;
}

// Usage:
const searchResults = useDebouncedMemo(
  () => performSearch(query),
  [query],
  500  // Wait 500ms after user stops typing
);

/**
 * Memoization with size limit (LRU cache)
 */
export function useLRUMemo(factory, deps, maxSize = 100) {
  const cache = useRef(new Map());
  
  return useMemo(() => {
    const key = JSON.stringify(deps);
    
    if (cache.current.has(key)) {
      // Move to end (most recently used)
      const value = cache.current.get(key);
      cache.current.delete(key);
      cache.current.set(key, value);
      return value;
    }
    
    const value = factory();
    
    // Add to cache
    cache.current.set(key, value);
    
    // Enforce size limit
    if (cache.current.size > maxSize) {
      const firstKey = cache.current.keys().next().value;
      cache.current.delete(firstKey);
    }
    
    return value;
  }, deps);
}

// ============================================
// 2. ADVANCED SELECTOR PATTERNS
// ============================================

/**
 * Memoized selector with equality function
 */
export function useMemoizedSelector(selector, equalityFn = Object.is) {
  const [value, setValue] = useState(selector);
  const selectorRef = useRef(selector);
  const valueRef = useRef(value);
  
  useEffect(() => {
    selectorRef.current = selector;
  });
  
  useEffect(() => {
    const newValue = selectorRef.current();
    
    if (!equalityFn(valueRef.current, newValue)) {
      valueRef.current = newValue;
      setValue(newValue);
    }
  });
  
  return value;
}

/**
 * Reselect-style memoized selector
 */
export function createMemoizedSelector(...funcs) {
  const resultFunc = funcs.pop();
  const dependencies = funcs;
  
  let lastArgs = null;
  let lastResult = null;
  
  return (...args) => {
    const currentArgs = dependencies.map(dep => dep(...args));
    
    if (
      lastArgs === null ||
      currentArgs.some((arg, i) => arg !== lastArgs[i])
    ) {
      lastArgs = currentArgs;
      lastResult = resultFunc(...currentArgs);
    }
    
    return lastResult;
  };
}

// Usage:
const selectItems = (state) => state.items;
const selectFilter = (state) => state.filter;

const selectFilteredItems = createMemoizedSelector(
  selectItems,
  selectFilter,
  (items, filter) => items.filter(item => item.category === filter)
);

// ============================================
// 3. COMPONENT MEMOIZATION UTILITIES
// ============================================

/**
 * Higher-order component for selective prop memoization
 */
export function withMemoizedProps(Component, propsToMemoize = []) {
  return React.memo(Component, (prevProps, nextProps) => {
    // Check only specified props
    return propsToMemoize.every(
      prop => Object.is(prevProps[prop], nextProps[prop])
    );
  });
}

// Usage:
const ProductCard = withMemoizedProps(
  ({ product, onAddToCart }) => {
    return (
      <div>
        <h3>{product.name}</h3>
        <button onClick={() => onAddToCart(product.id)}>Add to Cart</button>
      </div>
    );
  },
  ['product']  // Only re-render when product changes, ignore onAddToCart
);

/**
 * Memoized list renderer
 */
export function MemoizedList({ 
  items, 
  renderItem, 
  keyExtractor,
  itemMemoProps = []
}) {
  const MemoizedItem = useMemo(() => {
    return React.memo(
      renderItem,
      (prevProps, nextProps) => {
        return itemMemoProps.every(
          prop => Object.is(prevProps[prop], nextProps[prop])
        );
      }
    );
  }, [renderItem]);
  
  return (
    <>
      {items.map((item) => (
        <MemoizedItem key={keyExtractor(item)} {...item} />
      ))}
    </>
  );
}

// Usage:
<MemoizedList
  items={products}
  renderItem={({ id, name, price }) => (
    <div>
      <h3>{name}</h3>
      <p>${price}</p>
    </div>
  )}
  keyExtractor={(item) => item.id}
  itemMemoProps={['id', 'name', 'price']}
/>

// ============================================
// 4. CONTEXT OPTIMIZATION
// ============================================

/**
 * Split context provider with automatic memoization
 */
export function createMemoizedContext(initialValue = {}) {
  const Context = createContext(initialValue);
  
  function Provider({ value, children }) {
    // Automatically memoize context value
    const memoizedValue = useMemo(() => value, [
      JSON.stringify(value)
    ]);
    
    return (
      <Context.Provider value={memoizedValue}>
        {children}
      </Context.Provider>
    );
  }
  
  return [Context, Provider];
}

// Usage:
const [UserContext, UserProvider] = createMemoizedContext();

function App() {
  const [user, setUser] = useState(null);
  
  return (
    <UserProvider value={{ user, setUser }}>
      <AppContent />
    </UserProvider>
  );
}

/**
 * Selective context consumer
 */
export function createSelectContext(context) {
  return function useSelectContext(selector) {
    const value = useContext(context);
    return useMemo(() => selector(value), [value, selector]);
  };
}

// Usage:
const AppContext = createContext({ user: null, theme: 'light' });
const useAppContext = createSelectContext(AppContext);

function Component() {
  // Only re-renders when theme changes, not when user changes
  const theme = useAppContext(ctx => ctx.theme);
  return <div>Theme: {theme}</div>;
}

// ============================================
// 5. PERFORMANCE MONITORING
// ============================================

/**
 * Hook to track component renders
 */
export function useRenderCount(componentName) {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current++;
    console.log(`${componentName} rendered ${renderCount.current} times`);
  });
  
  return renderCount.current;
}

/**
 * Hook to detect unnecessary re-renders
 */
export function useWhyDidYouUpdate(name, props) {
  const previousProps = useRef();
  
  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps = {};
      
      allKeys.forEach(key => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key]
          };
        }
      });
      
      if (Object.keys(changedProps).length > 0) {
        console.log('[why-did-you-update]', name, changedProps);
      }
    }
    
    previousProps.current = props;
  });
}

// Usage:
function Component(props) {
  useWhyDidYouUpdate('Component', props);
  return <div>...</div>;
}

/**
 * Measure memoization effectiveness
 */
export function useMemoStats(name, computeFn, deps) {
  const computeCount = useRef(0);
  const hitCount = useRef(0);
  
  const value = useMemo(() => {
    computeCount.current++;
    console.log(`${name} computed ${computeCount.current} times`);
    return computeFn();
  }, deps);
  
  useEffect(() => {
    hitCount.current++;
    const hitRate = (hitCount.current - computeCount.current) / hitCount.current;
    console.log(`${name} cache hit rate: ${(hitRate * 100).toFixed(1)}%`);
  });
  
  return value;
}

// ============================================
// 6. COMPLETE EXAMPLE: OPTIMIZED DATA TABLE
// ============================================

function DataTable({ data, filters, sortBy, sortOrder }) {
  // Track renders for debugging
  useRenderCount('DataTable');
  useWhyDidYouUpdate('DataTable', { data, filters, sortBy, sortOrder });
  
  // Memoize filtering
  const filteredData = useMemo(() => {
    console.time('filtering');
    const result = data.filter(row => {
      return filters.every(filter => {
        return row[filter.key] === filter.value;
      });
    });
    console.timeEnd('filtering');
    return result;
  }, [data, filters]);
  
  // Memoize sorting
  const sortedData = useMemo(() => {
    console.time('sorting');
    const result = [...filteredData].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    console.timeEnd('sorting');
    return result;
  }, [filteredData, sortBy, sortOrder]);
  
  // Memoize row renderer
  const renderRow = useCallback((row) => {
    return <TableRow key={row.id} data={row} />;
  }, []);
  
  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {sortedData.map(renderRow)}
      </tbody>
    </table>
  );
}

// Memoized table row
const TableRow = React.memo(({ data }) => {
  return (
    <tr>
      <td>{data.id}</td>
      <td>{data.name}</td>
      <td>{data.value}</td>
    </tr>
  );
});

// Usage with memoized props
function App() {
  const [data, setData] = useState(generateData());
  const [filterValue, setFilterValue] = useState('all');
  
  // Memoize filters array to prevent unnecessary recalculations
  const filters = useMemo(() => {
    return filterValue === 'all' 
      ? [] 
      : [{ key: 'category', value: filterValue }];
  }, [filterValue]);
  
  return (
    <div>
      <select value={filterValue} onChange={e => setFilterValue(e.target.value)}>
        <option value="all">All</option>
        <option value="A">Category A</option>
        <option value="B">Category B</option>
      </select>
      
      <DataTable
        data={data}
        filters={filters}
        sortBy="name"
        sortOrder="asc"
      />
    </div>
  );
}
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**Performance Impact**:
- **60-90% fewer unnecessary renders**: Components only update when data changes
- **10-100× faster interactions**: Cache expensive calculations instead of repeating
- **Smoother UI**: Maintains 60 FPS during complex interactions
- **Better UX**: Instant feedback instead of lag during typing, scrolling, filtering

**User Experience**:
- **Responsive interactions**: Search, filtering, sorting feel instant
- **No janky animations**: Smooth scrolling and transitions
- **Lower bounce rates**: Fast apps keep users engaged
- **Higher conversions**: Every 100ms faster = ~1% conversion increase

**Business Value**:
- **Better engagement metrics**: Users interact more with responsive UIs
- **Lower infrastructure costs**: Fewer CPU cycles = lower cloud costs
- **Competitive advantage**: Performance is a feature
- **Mobile reach**: Essential for low-end devices and slow networks

### How It Works

**Technical Flow**:
```
1. Component renders with props/state
   ↓
2. useMemo/useCallback checks dependency array
   ↓
3. Compare new deps with cached deps (Object.is)
   ↓
4. If deps unchanged → return cached value
   ↓
5. If deps changed → recompute and cache new value
   ↓
6. React.memo compares props (shallow)
   ↓
7. If props unchanged → skip render, return cached result
   ↓
8. If props changed → render component
```

**Three Memoization Tools**:
```
useMemo:   Cache computed values
useCallback: Cache function references  
React.memo:  Cache component renders

When combined: Prevent cascading unnecessary renders
```

**Implementation Strategy**:
1. **Build feature without memoization** (make it work)
2. **Profile with React DevTools** (find bottlenecks)
3. **Identify slow components** (> 16ms render time)
4. **Identify frequent re-renders** (> 10 times per interaction)
5. **Add strategic memoization** (components, values, callbacks)
6. **Verify improvement** (profile again, measure impact)
7. **Monitor in production** (track render counts, timing)

**Decision Framework**:
```
Should I memoize this?

Is it expensive? (> 5ms calculation or > 10ms render)
├─ No → Don't memoize (overhead > benefit)
└─ Yes → Does it run frequently? (> 5 times per interaction)
           ├─ No → Don't memoize (rare, optimization not worth complexity)
           └─ Yes → Are dependencies stable?
                    ├─ No → Fix dependencies first
                    └─ Yes → Memoize and measure impact
```

**Key Principle**:
> "Profile first, optimize second. Memoize expensive operations with stable dependencies. Always measure impact—premature memoization adds complexity without benefit. Strategic memoization can transform janky UIs into smooth, responsive experiences."

────────────────────────────────────

**In a senior/staff interview, demonstrate**:
- Understanding of all three memoization tools (useMemo, useCallback, React.memo)
- Knowledge of when NOT to memoize (simple calculations, unstable dependencies)
- Profiling workflow (React DevTools, Why Did You Render)
- Real metrics: render counts, timing, FPS improvements
- Deep understanding: shallow vs deep comparison, stale closures, memory trade-offs
- Production experience: monitoring, debugging, real-world incident stories
- Advanced patterns: context optimization, selector patterns, custom hooks
- Trade-off awareness: memory vs speed, complexity vs performance
