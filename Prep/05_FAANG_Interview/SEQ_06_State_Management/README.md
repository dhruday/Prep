# PART 5️⃣ — State Management (Core Interview Area)

## 📖 Overview

State management is **the #1 asked topic** in frontend system design interviews. At scale, managing state correctly is the difference between a maintainable app and spaghetti code.

This section covers state fundamentals, tools (Redux, MobX, Zustand), patterns (lifting state, composition), and how to scale state for millions of users.

## 🎯 Why This Matters

**Interview Reality**:
- "Design Facebook's news feed state management."
- "How would you handle real-time notifications state?"
- "Compare Redux vs Context API at scale."

These questions test your understanding of:
- State patterns (local vs global, server vs client)
- State synchronization (optimistic updates, conflicts)
- State at scale (normalization, selectors, memoization)

---

## 📚 Module Breakdown

### Module 5.1 — State Fundamentals
**Focus**: Core state concepts and patterns

**Topics Covered**:

#### **Types of State**
```
┌─────────────────────────────────────────────────────────────┐
│                    STATE CLASSIFICATION                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. LOCAL STATE (Component State)                           │
│     • Owned by single component                             │
│     • useState, useReducer                                  │
│     • Examples: form inputs, toggles, hover                 │
│                                                              │
│  2. SHARED STATE (Cross-Component)                          │
│     • Multiple components need access                       │
│     • Lifting state up, Context API                         │
│     • Examples: theme, language, auth user                  │
│                                                              │
│  3. REMOTE STATE (Server State)                             │
│     • Source of truth is server                             │
│     • React Query, SWR, Apollo                              │
│     • Examples: user profile, products, posts               │
│                                                              │
│  4. URL STATE (Router State)                                │
│     • Derived from URL params/query                         │
│     • React Router, Next.js router                          │
│     • Examples: filters, pagination, tabs                   │
│                                                              │
│  5. GLOBAL STATE (App-Wide)                                 │
│     • Truly global data                                     │
│     • Redux, Zustand, Jotai                                 │
│     • Examples: shopping cart, notifications                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Decision Tree**:
```
Does only 1 component need this state?
 ├─ YES → Local state (useState)
 └─ NO → Does it come from server?
     ├─ YES → Remote state (React Query)
     └─ NO → Is it route-dependent?
         ├─ YES → URL state (router)
         └─ NO → Is it app-wide?
             ├─ YES → Global state (Redux/Zustand)
             └─ NO → Shared state (Context)
```

#### **State Patterns**

**1. Lifting State Up**
```jsx
// ❌ Bad: Duplicate state
function ProductPage() {
  const [cart, setCart] = useState([]);
  return <Header cart={cart} />;
}

function Header({ cart }) {
  // Cart data, but can't update it
}

// ✅ Good: Lift to common ancestor
function App() {
  const [cart, setCart] = useState([]);
  
  return (
    <>
      <Header cart={cart} />
      <ProductPage cart={cart} onAddToCart={addItem} />
    </>
  );
}
```

**2. State Colocation**
```jsx
// ❌ Bad: State too high
function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return <LoginForm email={email} password={password} />;
}

// ✅ Good: Colocate state
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // State lives where it's used
}
```

**3. Derived State**
```jsx
// ❌ Bad: Redundant state
const [items, setItems] = useState([]);
const [total, setTotal] = useState(0);

// Need to keep in sync manually

// ✅ Good: Derive from source of truth
const [items, setItems] = useState([]);
const total = items.reduce((sum, item) => sum + item.price, 0);
```

#### **State Immutability**
```jsx
// ❌ Bad: Mutating state
const [cart, setCart] = useState([{ id: 1, qty: 1 }]);

function addItem() {
  cart.push({ id: 2, qty: 1 }); // Mutation!
  setCart(cart); // Won't trigger re-render
}

// ✅ Good: Immutable updates
function addItem() {
  setCart([...cart, { id: 2, qty: 1 }]);
}

// For complex updates: Immer
import { produce } from 'immer';

function updateQty(id, qty) {
  setCart(produce(draft => {
    const item = draft.find(i => i.id === id);
    item.qty = qty; // Looks like mutation, but Immer handles it
  }));
}
```

**Interview Questions**:
- "Explain different types of state."
- "When would you lift state up vs use Context?"
- "How do you handle derived state?"

**Interview Relevance**: 🔥🔥🔥🔥🔥
This is foundational. Must-know for all levels.

---

### Module 5.2 — State Tools & Patterns
**Focus**: Redux, MobX, Zustand, Context API

**Topics Covered**:

#### **Context API**
```jsx
┌─────────────────────────────────────────────────────────────┐
│                     CONTEXT API                              │
├─────────────────────────────────────────────────────────────┤
│  Pros:                                                       │
│  • Built into React (no library)                            │
│  • Simple for small state                                   │
│  • Good for theme, i18n, auth                               │
│                                                              │
│  Cons:                                                       │
│  • Performance issues (re-renders all consumers)            │
│  • No devtools                                              │
│  • Can't easily split state                                 │
│                                                              │
│  When to Use: < 5 global values, simple reads              │
└─────────────────────────────────────────────────────────────┘

// Example: Auth Context
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  
  const login = async (email, password) => {
    const user = await api.login(email, password);
    setUser(user);
  };
  
  return (
    <AuthContext.Provider value={{ user, login }}>
      {children}
    </AuthContext.Provider>
  );
}

// ⚠️ Performance Problem:
// Every time user changes, ALL consumers re-render
// Solution: Split contexts or use useContextSelector
```

#### **Redux**
```
┌─────────────────────────────────────────────────────────────┐
│                        REDUX                                 │
├─────────────────────────────────────────────────────────────┤
│  Architecture:                                               │
│                                                              │
│  Action → Reducer → Store → View                           │
│              ↑                  │                            │
│              └──────────────────┘                            │
│              (Unidirectional Flow)                           │
│                                                              │
│  Pros:                                                       │
│  • Predictable state (single source of truth)               │
│  • Time-travel debugging (Redux DevTools)                   │
│  • Middleware (logging, async, analytics)                   │
│  • Selector optimization (Reselect)                         │
│                                                              │
│  Cons:                                                       │
│  • Boilerplate (actions, reducers, types)                   │
│  • Learning curve                                           │
│  • Async complexity (thunks, sagas)                         │
│                                                              │
│  When to Use: Complex apps, team > 5, needs debuggability   │
└─────────────────────────────────────────────────────────────┘
```

**Redux Toolkit (Modern Redux)**
```javascript
import { createSlice, configureStore } from '@reduxjs/toolkit';

// Slice (combines actions + reducer)
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addItem: (state, action) => {
      // Immer built-in, so you can "mutate"
      state.items.push(action.payload);
    },
    removeItem: (state, action) => {
      state.items = state.items.filter(i => i.id !== action.payload);
    }
  }
});

// Store
const store = configureStore({
  reducer: {
    cart: cartSlice.reducer
  }
});

// Usage in component
import { useSelector, useDispatch } from 'react-redux';

function Cart() {
  const items = useSelector(state => state.cart.items);
  const dispatch = useDispatch();
  
  return (
    <button onClick={() => dispatch(cartSlice.actions.addItem(item))}>
      Add to Cart
    </button>
  );
}
```

**Redux Async with RTK Query**
```javascript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: () => '/products',
      // Auto caching, refetching, invalidation
    }),
    addProduct: builder.mutation({
      query: (product) => ({
        url: '/products',
        method: 'POST',
        body: product
      }),
      // Auto invalidates getProducts cache
      invalidatesTags: ['Products']
    })
  })
});

// Auto-generated hooks
const { data, isLoading } = api.useGetProductsQuery();
const [addProduct] = api.useAddProductMutation();
```

#### **Zustand (Minimalist)**
```javascript
┌─────────────────────────────────────────────────────────────┐
│                      ZUSTAND                                 │
├─────────────────────────────────────────────────────────────┤
│  • Minimal API (single hook)                                │
│  • No providers                                             │
│  • Built-in selectors                                       │
│  • TypeScript-friendly                                      │
│                                                              │
│  When to Use: Need Redux simplicity, hooks-first           │
└─────────────────────────────────────────────────────────────┘

import create from 'zustand';

const useStore = create((set) => ({
  cart: [],
  addItem: (item) => set((state) => ({
    cart: [...state.cart, item]
  })),
  removeItem: (id) => set((state) => ({
    cart: state.cart.filter(i => i.id !== id)
  }))
}));

// Usage (no provider needed!)
function Cart() {
  const cart = useStore((state) => state.cart);
  const addItem = useStore((state) => state.addItem);
  
  return <button onClick={() => addItem(item)}>Add</button>;
}
```

#### **MobX (Reactive)**
```javascript
┌─────────────────────────────────────────────────────────────┐
│                       MOBX                                   │
├─────────────────────────────────────────────────────────────┤
│  • Reactive programming (observables)                       │
│  • Automatic dependency tracking                            │
│  • No explicit subscriptions                                │
│  • Less boilerplate than Redux                              │
│                                                              │
│  When to Use: OOP background, complex data models           │
└─────────────────────────────────────────────────────────────┘

import { makeObservable, observable, action } from 'mobx';
import { observer } from 'mobx-react-lite';

class CartStore {
  items = [];
  
  constructor() {
    makeObservable(this, {
      items: observable,
      addItem: action
    });
  }
  
  addItem(item) {
    this.items.push(item); // Direct mutation allowed!
  }
}

const cartStore = new CartStore();

// Component auto re-renders when items changes
const Cart = observer(() => {
  return (
    <button onClick={() => cartStore.addItem(item)}>
      {cartStore.items.length}
    </button>
  );
});
```

#### **Comparison**

```
┌──────────────┬────────────┬────────────┬────────────┬────────────┐
│              │ Context    │ Redux      │ Zustand    │ MobX       │
├──────────────┼────────────┼────────────┼────────────┼────────────┤
│ Bundle Size  │ 0 KB       │ 8 KB       │ 1 KB       │ 16 KB      │
│ Boilerplate  │ Low        │ High       │ Very Low   │ Low        │
│ DevTools     │ No         │ Yes        │ Yes        │ Yes        │
│ Learning     │ Easy       │ Hard       │ Easy       │ Medium     │
│ Performance  │ Medium     │ High       │ High       │ High       │
│ Async        │ Manual     │ Middleware │ Manual     │ Easy       │
│ TypeScript   │ Good       │ Good       │ Great      │ Good       │
└──────────────┴────────────┴────────────┴────────────┴────────────┘

When to Use:
• Context:   < 5 global values, simple theme/auth
• Redux:     Large teams, complex async, need debugging
• Zustand:   Want Redux simplicity, hooks-first
• MobX:      Complex data models, OOP background
```

**Interview Questions**:
- "Compare Redux vs Context API."
- "When would you use Zustand over Redux?"
- "Explain Redux middleware."
- "How does MobX achieve reactivity?"

**Interview Relevance**: 🔥🔥🔥🔥🔥
Most common state management question in interviews.

---

### Module 5.3 — State at Scale
**Focus**: Normalization, selectors, real-time, conflicts

**Topics Covered**:

#### **State Normalization**
```javascript
// ❌ Bad: Nested data (hard to update)
{
  posts: [
    {
      id: 1,
      title: 'Post 1',
      author: { id: 1, name: 'Alice' },
      comments: [
        { id: 1, text: 'Comment 1', author: { id: 2, name: 'Bob' } }
      ]
    }
  ]
}

// To update Alice's name, you need to traverse all posts & comments!

// ✅ Good: Normalized (flat)
{
  posts: {
    byId: {
      1: { id: 1, title: 'Post 1', authorId: 1, commentIds: [1] }
    },
    allIds: [1]
  },
  users: {
    byId: {
      1: { id: 1, name: 'Alice' },
      2: { id: 2, name: 'Bob' }
    },
    allIds: [1, 2]
  },
  comments: {
    byId: {
      1: { id: 1, text: 'Comment 1', authorId: 2 }
    },
    allIds: [1]
  }
}

// Update Alice: state.users.byId[1].name = 'Alice Updated'
```

**Normalization with normalizr**
```javascript
import { normalize, schema } from 'normalizr';

// Define schema
const user = new schema.Entity('users');
const comment = new schema.Entity('comments', { author: user });
const post = new schema.Entity('posts', {
  author: user,
  comments: [comment]
});

// Normalize API response
const response = [
  { id: 1, title: 'Post 1', author: { ... }, comments: [ ... ] }
];

const normalized = normalize(response, [post]);
// Result: { entities: { users, posts, comments }, result: [1] }
```

#### **Selectors & Memoization**
```javascript
// ❌ Bad: Compute in component (re-compute on every render)
function Cart() {
  const items = useSelector(state => state.cart.items);
  const total = items.reduce((sum, item) => sum + item.price, 0); // ❌
  return <div>{total}</div>;
}

// ✅ Good: Memoized selector (only re-compute if items change)
import { createSelector } from '@reduxjs/toolkit';

const selectCartItems = state => state.cart.items;
const selectCartTotal = createSelector(
  [selectCartItems],
  (items) => items.reduce((sum, item) => sum + item.price, 0)
);

function Cart() {
  const total = useSelector(selectCartTotal); // ✅ Memoized
  return <div>{total}</div>;
}

// Complex selectors with multiple inputs
const selectFilteredProducts = createSelector(
  [selectProducts, selectSearchQuery, selectCategory],
  (products, query, category) => {
    return products
      .filter(p => p.name.includes(query))
      .filter(p => !category || p.category === category);
  }
);
```

#### **Real-Time State Sync**
```javascript
// WebSocket integration with Redux
function* watchWebSocket() {
  const socket = io('https://api.example.com');
  
  const channel = yield call(createWebSocketChannel, socket);
  
  while (true) {
    const action = yield take(channel);
    yield put(action); // Dispatch to Redux
  }
}

function createWebSocketChannel(socket) {
  return eventChannel((emit) => {
    socket.on('message', (data) => {
      emit({ type: 'WS_MESSAGE', payload: data });
    });
    
    socket.on('disconnect', () => {
      emit(END);
    });
    
    return () => socket.disconnect();
  });
}

// Optimistic updates
function* addTodo(action) {
  const tempId = uuid();
  
  // 1. Optimistically add to state
  yield put({ type: 'ADD_TODO_OPTIMISTIC', payload: { ...action.payload, id: tempId } });
  
  try {
    // 2. Send to server
    const todo = yield call(api.addTodo, action.payload);
    
    // 3. Replace temp with real
    yield put({ type: 'ADD_TODO_SUCCESS', payload: todo, tempId });
  } catch (error) {
    // 4. Rollback on error
    yield put({ type: 'ADD_TODO_FAILURE', tempId });
  }
}
```

#### **Conflict Resolution**
```javascript
// Last-Write-Wins (LWW)
{
  id: 1,
  text: 'Todo',
  version: 3 // Increment on each update
}

// Server rejects updates with old version

// Operational Transform (OT) - Like Google Docs
function transform(op1, op2) {
  // Transform op1 against op2
  // Returns new op1' that can be applied after op2
}

// Conflict-Free Replicated Data Types (CRDT)
import * as Y from 'yjs';

const doc = new Y.Doc();
const todos = doc.getArray('todos');

// Multiple clients can edit, auto-merges
todos.push(['Buy milk']);
```

#### **State Persistence**
```javascript
// Redux Persist
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // localStorage

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['cart'], // Only persist cart
};

const persistedReducer = persistReducer(persistConfig, rootReducer);
const store = createStore(persistedReducer);
const persistor = persistStore(store);

// Zustand persist
import create from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      cart: [],
      addItem: (item) => set((state) => ({ cart: [...state.cart, item] }))
    }),
    { name: 'cart-storage' } // localStorage key
  )
);
```

**Interview Questions**:
- "How do you normalize state?"
- "Explain selectors and memoization."
- "How would you handle real-time updates?"
- "Design conflict resolution for collaborative editing."

**Interview Relevance**: 🔥🔥🔥🔥🔥
Asked for L5+ (senior) roles managing complex state.

---

## 🎓 Study Plan

### Week 1: Fundamentals
- **Day 1-2**: Types of state (local, global, server, URL)
- **Day 3-4**: State patterns (lifting, colocation, derived)
- **Day 5-6**: Immutability (Immer, spread operators)
- **Day 7**: Practice: Build form with proper state management

### Week 2: Tools
- **Day 1-2**: Context API (pros/cons, performance)
- **Day 3-4**: Redux Toolkit (slices, RTK Query)
- **Day 5**: Zustand, MobX comparison
- **Day 6-7**: Practice: Rebuild app with different tools

### Week 3: Scale
- **Day 1-2**: Normalization (normalizr)
- **Day 3-4**: Selectors (Reselect, memoization)
- **Day 5-6**: Real-time (WebSocket, optimistic updates)
- **Day 7**: Conflict resolution patterns

### Week 4: Integration
- **Day 1-3**: Build mini Twitter clone (state management focus)
- **Day 4-5**: Practice architecture interviews
- **Day 6-7**: Review and refine

---

## 📊 Assessment Checklist

### Module 5.1: Fundamentals
- [ ] Can classify state types (local, global, server, URL)
- [ ] Can apply state patterns (lifting, colocation, derived)
- [ ] Can explain immutability and implement it
- [ ] Can decide where state should live

### Module 5.2: Tools
- [ ] Can explain Context API performance issues
- [ ] Can implement Redux with Redux Toolkit
- [ ] Can compare Redux vs Zustand vs MobX
- [ ] Can choose the right tool for the use case

### Module 5.3: Scale
- [ ] Can normalize nested data structures
- [ ] Can implement memoized selectors
- [ ] Can design real-time state sync
- [ ] Can explain conflict resolution strategies

---

## 🎯 Common Interview Questions (Part 5)

### Fundamentals
1. "What are the different types of state in React?"
2. "When should you lift state up?"
3. "Explain immutability. Why is it important?"

### Tools
1. "Redux vs Context API - when would you use each?"
2. "What are the downsides of Redux?"
3. "How does Zustand compare to Redux?"
4. "Explain Redux middleware."

### Scale
1. "How do you normalize state? Why?"
2. "Design state management for a news feed (Twitter-like)."
3. "How would you handle real-time notifications?"
4. "Explain optimistic updates."
5. "Design collaborative editing (Google Docs-like)."

### Real-World Scenarios
1. "Design Facebook news feed state management."
2. "Design Slack message state (with real-time updates)."
3. "Design e-commerce cart (with persistence)."
4. "Design dashboard with 50+ charts (performance)."

---

## 💡 Key Takeaways

### State Management Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│          STATE MANAGEMENT DECISION TREE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Q1: Is it server data?                                     │
│   YES → React Query / SWR / Apollo                          │
│   NO  → Continue                                            │
│                                                              │
│  Q2: Is it tied to URL?                                     │
│   YES → URL params / query strings                          │
│   NO  → Continue                                            │
│                                                              │
│  Q3: How many components need it?                           │
│   1   → Local state (useState)                              │
│   2-3 → Lift to common ancestor                             │
│   4+  → Continue                                            │
│                                                              │
│  Q4: How complex is the logic?                              │
│   Simple  → Context API                                     │
│   Complex → Continue                                        │
│                                                              │
│  Q5: Team size & debugging needs?                           │
│   < 5 devs, simple    → Zustand                             │
│   > 5 devs, debugging → Redux                               │
│   OOP background      → MobX                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Common Mistakes

❌ **Over-using global state**
- Not everything needs Redux
- Keep state as local as possible

❌ **Under-using server state libraries**
- Don't reinvent caching with Redux
- Use React Query / SWR for server data

❌ **Prop drilling instead of composition**
- Prefer component composition over deep prop passing

❌ **Ignoring memoization**
- Selectors prevent expensive re-computations

---

## 📚 Recommended Resources

### Documentation
- [Redux Toolkit](https://redux-toolkit.js.org/) - Modern Redux
- [React Query](https://tanstack.com/query) - Server state
- [Zustand](https://github.com/pmndrs/zustand) - Minimal state
- [MobX](https://mobx.js.org/) - Reactive state

### Articles
- [You Might Not Need Redux](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367)
- [State Colocation](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster)
- [Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react)

### Books
- **"Learning Redux"** by Daniel Bugl
- **"Redux in Action"** by Marc Garreau

### Real-World Case Studies
- **Facebook**: Flux architecture origin
- **Twitter**: Redux → React Query migration
- **Airbnb**: Redux at scale (normalization)
- **Netflix**: MobX for complex UI state

---

## 🎬 Next Steps

After completing Part 5, you should:

1. ✅ Understand all state types and when to use each
2. ✅ Can implement Redux, Zustand, MobX
3. ✅ Can design state for large-scale apps
4. ✅ Can answer 90% of state interview questions

**Proceed to**: [PART 7 — Performance Optimization](../PART%207️⃣%20—%20Performance%20Optimization/README.md)

This will cover performance profiling and optimization techniques.

---

**Part 5 Status**: State Management Mastery ✅
**Estimated Study Time**: 4 weeks
**Next Part**: Performance Optimization (Core Web Vitals, profiling)

You now have the knowledge to manage state like a senior engineer! 🧠
