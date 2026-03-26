# Redux Toolkit — createSlice, createAsyncThunk, RTK Query
> Part 13 — State Management
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Redux Toolkit (RTK)**: the official, opinionated way to write Redux in 2026; eliminates boilerplate from classic Redux (no action type constants, no separate action creators, no spread operators); uses Immer under the hood so you can write "mutating" code that is actually immutable
- **`createSlice`**: defines a slice of state, its initial value, AND all its reducer functions in one object; automatically generates action creators and action type strings; replaces: `const MY_ACTION = 'MY_ACTION'`, `function myActionCreator()`, `switch(action.type)` reducer — all three replaced by one `createSlice` call
- **`createAsyncThunk`**: handles async operations (HTTP calls) in three states — pending, fulfilled, rejected; auto-generates action types; use `extraReducers` to respond to these three states; consider RTK Query before reaching for this
- **RTK Query**: built into Redux Toolkit; handles ALL server data fetching and caching; defines API endpoints declaratively; generates React hooks automatically (`useGetProductQuery`, `useCreateOrderMutation`); replaces: `createAsyncThunk` + loading/error state + cache logic + invalidation — all automatically
- **Immer mutations are safe**: in `createSlice` reducers you write `state.items.push(item)` — this is NOT mutating Redux state; Immer intercepts it and produces a new immutable object; outside of a `createSlice` reducer or `produce()` call, you must still use immutable patterns
- **Selector memoization**: RTK generates basic selectors; use `createSelector` (from Reselect, included in RTK) for derived selectors that should recompute only when inputs change; `createSelector(() => state.cart.items, items => items.length)` — recomputes only when items array changes
- ✅ **Hruday's anchor**: SAP Labs — RTK store with 14 slices for auth/cart/permissions/feature flags; RTK Query replaced 8 `createAsyncThunk` patterns; SAP Excellence Award for frontend architecture quality

---

## 1. One-Line Definition
Redux Toolkit is the official Redux package that eliminates boilerplate with `createSlice` for state + reducers, `createAsyncThunk` for async actions, and RTK Query for complete server data caching — making Redux practical for production React apps without the ceremony of classic Redux.

---

## 2. The Problem It Solves

Classic Redux required writing the same logic in three separate places for every state change. To add "increment counter," you needed: a string constant (`INCREMENT_COUNTER`), an action creator function (`const incrementCounter = () => ({ type: INCREMENT_COUNTER })`), and a case in the reducer switch statement. For 20 features, that's 60 separate pieces of code to keep in sync.

Classic Redux also had no built-in async story. Adding an HTTP call required `redux-thunk`, then creating three action types per request (REQUEST, SUCCESS, FAILURE), three action creators, and three reducer cases. A single "fetch products" feature was 30+ lines of boilerplate.

Redux Toolkit solves both. `createSlice` collapses the constant + action creator + reducer into one function call. `createAsyncThunk` handles the three-state async lifecycle. RTK Query goes further and eliminates even the `createAsyncThunk` for data fetching — replacing all the loading/error state management with a declarative cache-oriented API that generates React hooks automatically.

---

## 3. How It Works Internally

### createSlice — What It Generates

```typescript
// What you write:
const counterSlice = createSlice({
  name: 'counter',              // ← slice name prefix for action types
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1; },   // ← Immer: "mutation" but safe
    addAmount: (state, action: PayloadAction<number>) => { state.value += action.payload; }
  }
});

// What createSlice automatically generates for you:
counterSlice.actions.increment     → action creator: () => ({ type: 'counter/increment' })
counterSlice.actions.addAmount     → action creator: (n) => ({ type: 'counter/addAmount', payload: n })
counterSlice.reducer               → the root reducer function for this slice

// How Immer works inside createSlice reducers:
state.value += 1;  // looks like mutation
// Immer actually:
// 1. Creates a Proxy wrapping the current state
// 2. Records all "mutations" through the Proxy
// 3. Produces a NEW immutable object with those changes applied
// 4. Returns the new object — Redux state is never actually mutated
// Outside createSlice: you must still return new objects manually (no Immer proxy)
```

### RTK Query — How Caching Works

```
RTK Query internal cache model:

Query: useGetProductsQuery({ category: 'electronics' })
  ↓
RTK Query checks cache for key: ['products', { category: 'electronics' }]
  Cache MISS → dispatch fetchBaseQuery GET /api/products?category=electronics
  Cache HIT + not stale → return cached data immediately, no HTTP call
  Cache HIT + stale → return cached data immediately AND refetch in background
  
Cache entry lifecycle:
  1. First subscriber mounts → fetch triggered, data stored
  2. Additional subscribers for same key → receive cached data, no new fetch
  3. All subscribers unmount → keepUnusedDataFor timer starts (default: 60s)
  4. Timer expires → cache entry removed
  5. New subscriber arrives before timer → cache still available (no re-fetch)

Cache invalidation via tags:
  invalidatesTags: ['Products'] on a mutation (createOrder, updateProduct)
  → All queries that providesTags: ['Products'] are automatically refetched
  → Your product list updates after you add a product — automatically, no manual dispatch
```

---

## 4. The Code

### Wrong Way — Classic Redux Boilerplate

```typescript
// ❌ WRONG — Classic Redux (pre-RTK): three places for every state change

// File 1: actionTypes.ts
export const ADD_TO_CART = 'ADD_TO_CART';
export const REMOVE_FROM_CART = 'REMOVE_FROM_CART';
export const FETCH_PRODUCTS_REQUEST = 'FETCH_PRODUCTS_REQUEST';
export const FETCH_PRODUCTS_SUCCESS = 'FETCH_PRODUCTS_SUCCESS';
export const FETCH_PRODUCTS_FAILURE = 'FETCH_PRODUCTS_FAILURE';

// File 2: cartActions.ts
export const addToCart = (item: CartItem) => ({ type: ADD_TO_CART, payload: item });
export const removeFromCart = (id: string) => ({ type: REMOVE_FROM_CART, payload: id });
// Thunk action
export const fetchProducts = () => async (dispatch: Dispatch) => {
  dispatch({ type: FETCH_PRODUCTS_REQUEST });
  try {
    const data = await api.getProducts();
    dispatch({ type: FETCH_PRODUCTS_SUCCESS, payload: data });
  } catch (error) {
    dispatch({ type: FETCH_PRODUCTS_FAILURE, payload: error.message });
  }
};

// File 3: cartReducer.ts
const cartReducer = (state = initialState, action: AnyAction) => {
  switch (action.type) {
    case ADD_TO_CART:
      // ❌ Must always return new object — no Immer, manual spread required
      return { ...state, items: [...state.items, action.payload] };
    case REMOVE_FROM_CART:
      return { ...state, items: state.items.filter(i => i.id !== action.payload) };
    case FETCH_PRODUCTS_REQUEST:
      return { ...state, loading: true };
    case FETCH_PRODUCTS_SUCCESS:
      return { ...state, loading: false, products: action.payload };
    case FETCH_PRODUCTS_FAILURE:
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};
// ❌ 50+ lines for add/remove cart + fetch products.
// No cache management, no deduplication, no stale logic. All manual.
```

> **Why this fails in production:** every feature requires 3x the code across 3 files; typos in action type strings are silent bugs; spread-based immutability is error-prone for nested state; there's no built-in cache management for server data.

### Right Way — Redux Toolkit with RTK Query

```typescript
// ✅ RIGHT — Redux Toolkit: createSlice for client state

// store/cartSlice.ts
import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] } as CartState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        // ✅ Immer: "mutation" syntax is safe inside createSlice reducers
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      // ✅ Filter returns new array — Immer also accepts reassignment
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];  // ✅ Direct reassignment of nested — Immer handles this
    }
  }
});

// ✅ Export actions and reducer
export const { addItem, removeItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;

// ✅ Memoized selectors with createSelector (only recomputes when inputs change)
const selectCartItems = (state: RootState) => state.cart.items;

export const selectCartCount = createSelector(
  selectCartItems,
  items => items.reduce((sum, i) => sum + i.quantity, 0)
  // Recomputes ONLY when items array reference changes — not on every render
);

export const selectCartTotal = createSelector(
  selectCartItems,
  items => items.reduce((sum, i) => sum + i.price * i.quantity, 0)
);

// ✅ Usage in component:
const CartBadge = () => {
  const count = useAppSelector(selectCartCount);  // Memoized — no unnecessary re-renders
  return <span className="badge">{count}</span>;
};
```

```typescript
// ✅ RIGHT — RTK Query for server data (replaces createAsyncThunk + manual cache)

// store/productsApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Define the API with RTK Query
export const productsApi = createApi({
  reducerPath: 'productsApi',       // Key in the Redux store for RTK Query's cache
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      // ✅ Attach JWT from auth slice to every request automatically
      const token = (getState() as RootState).auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    }
  }),
  tagTypes: ['Product', 'Order'],   // Cache tag types for invalidation
  
  endpoints: (builder) => ({
    // ✅ QUERY endpoint (GET) — auto-generates useGetProductsQuery hook
    getProducts: builder.query<Product[], { category?: string }>({
      query: ({ category }) => ({
        url: '/products',
        params: category ? { category } : undefined
      }),
      providesTags: (result) =>
        result
          ? [...result.map(p => ({ type: 'Product' as const, id: p.id })), 'Product']
          : ['Product']
      // ✅ Cache is tagged with 'Product'; invalidating 'Product' refetches this query
    }),
    
    getProductById: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (_, __, id) => [{ type: 'Product', id }]
    }),
    
    // ✅ MUTATION endpoint (POST/PUT/DELETE) — auto-generates useCreateOrderMutation hook
    createOrder: builder.mutation<Order, CreateOrderRequest>({
      query: (orderData) => ({
        url: '/orders',
        method: 'POST',
        body: orderData
      }),
      // ✅ Invalidate 'Order' tag after creating — any query with 'Order' tag refetches
      invalidatesTags: ['Order']
    }),
    
    updateProduct: builder.mutation<Product, { id: string; data: Partial<Product> }>({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: 'PATCH',
        body: data
      }),
      // ✅ Invalidate specific product — only that product's query refetches
      invalidatesTags: (_, __, { id }) => [{ type: 'Product', id }]
    }),
  })
});

// ✅ Export auto-generated hooks — no action creators, no thunks to write
export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateOrderMutation,
  useUpdateProductMutation
} = productsApi;


// ✅ Usage in component — loading, error, data all handled:
const ProductList: React.FC<{ category: string }> = ({ category }) => {
  const {
    data: products,
    isLoading,
    isFetching,   // true during background refetch (data is already available)
    error
  } = useGetProductsQuery({ category }, {
    pollingInterval: 30_000,    // Optional: refetch every 30s
    refetchOnFocus: true,       // Refetch when user tabs back to the app
    skip: !category,            // Skip query if category is empty
  });
  
  if (isLoading) return <ProductSkeleton />;
  if (error) return <ErrorBanner message="Failed to load products" />;
  
  return (
    <div className={isFetching ? 'refreshing' : ''}>  {/* Show subtle "refreshing" indicator */}
      {products?.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  );
};

// ✅ Mutation usage with optimistic update:
const AddToCartButton: React.FC<{ product: Product }> = ({ product }) => {
  const [createOrder, { isLoading: isOrdering }] = useCreateOrderMutation();
  const dispatch = useAppDispatch();
  
  const handleAddToCart = async () => {
    dispatch(addItem({ id: product.id, name: product.name, price: product.price, quantity: 1 }));
    // Cart state updated immediately in Redux (optimistic local update)
  };
  
  return (
    <button onClick={handleAddToCart} disabled={isOrdering}>
      Add to Cart
    </button>
  );
};


// ✅ RIGHT — Store setup with RTK Query middleware
// store/store.ts
export const store = configureStore({
  reducer: {
    cart: cartReducer,
    auth: authReducer,
    [productsApi.reducerPath]: productsApi.reducer,  // ← RTK Query reducer added here
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(productsApi.middleware),  // ← Required for RTK Query cache logic
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// ✅ Typed hooks (never use plain useSelector/useDispatch — use typed versions)
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How does `createSlice` differ from writing a Redux reducer manually?"

**Hruday's answer:**
> There are three key differences. First, `createSlice` keeps everything in one place — the initial state, the reducer logic, AND the action creator generation all happen inside one function call. With classic Redux, those three things lived in separate files and you had to manually keep them in sync. A typo in an action type string would silently break a reducer case — no compile error, just wrong behavior.
>
> Second, `createSlice` uses Immer under the hood. This means inside a slice's reducer functions, you can write code that looks like direct mutation — `state.items.push(item)` or `state.user.name = 'Hruday'`. Immer intercepts these through a Proxy, records the changes, and returns a new immutable state object. Classic Redux required manual spread operators for every nested update, which gets verbose and error-prone for three or four levels deep.
>
> Third, `createSlice` automatically generates action type strings in the format `sliceName/reducerName` — for example `cart/addItem`. These strings are unique by convention, type-safe through TypeScript, and you never have to declare a string constant for them anywhere.
>
> The practical result: a feature that took 50 lines across three files in classic Redux takes 15-20 lines in one `createSlice` call.

---

### Q2 — SAP Experience
**Interviewer asks:** "When would you use `createAsyncThunk` vs RTK Query?"

**Hruday's answer:**
> My default for any data fetching is RTK Query. It gives you automatic cache management, loading and error states, request deduplication, background refetch, and cache invalidation via tags — all in a declarative API endpoint definition. You get generated React hooks that components use directly — no dispatching, no selectors for loading state, no boilerplate at all.
>
> I'd use `createAsyncThunk` when the async operation is NOT straightforward data fetching and caching. Specific cases:
>
> One — authentication flows. Login involves dispatching to set the token, calling the API, handling the response, writing to localStorage, and updating multiple slices. This complex orchestration is better in a thunk than an RTK Query endpoint.
>
> Two — operations with complex side effects across multiple slices. If submitting an order should update cart state AND user stats AND trigger a notification, a thunk that dispatches multiple synchronous actions after the API call completes is cleaner than an RTK Query mutation.
>
> Three — when the "backend" is not an HTTP endpoint. File system operations, IndexedDB, WebSocket handshakes — `createAsyncThunk` handles any Promise-returning function.
>
> At SAP, I replaced eight `createAsyncThunk` patterns that were plain GET fetches with RTK Query endpoints. The result was roughly 400 lines removed from the codebase, and we immediately gained features like background refetch and request deduplication that were previously missing.

---

### Q3 — Deep Dive
**Interviewer asks:** "How does RTK Query's cache invalidation work?"

**Hruday's answer:**
> RTK Query uses a tag-based system. You define `tagTypes` on your API (`tagTypes: ['Product', 'Order']`). Each query endpoint declares which tags it `providesTags` — what cache keys it creates. Each mutation endpoint declares what tags it `invalidatesTags` — what caches it should bust after running.
>
> When a mutation with `invalidatesTags: ['Product']` succeeds, RTK Query finds all active query subscriptions that have `providesTags` including the `'Product'` tag, marks them as stale, and triggers a refetch. The UI updates automatically.
>
> The smart part is granularity. You can tag by entity type AND by ID: `providesTags: [{ type: 'Product', id: product.id }]`. Then a mutation that updates a specific product can `invalidatesTags: [{ type: 'Product', id: updatedId }]` — busting only that product's cache entries, not refetching the entire product list. This is the correct pattern for large lists where invalidating the whole list on every update would be expensive.
>
> The system is entirely automatic once tags are declared. No manual cache clearing, no `dispatch(clearProducts())`, no stale check logic. Declare the relationships between queries and mutations via tags, and RTK Query maintains consistency.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design the Redux store for a multi-step checkout flow."

**Hruday's answer:**
> I'd structure the store around three distinct concerns.
>
> Cart slice — the persistent user intent. Items, quantities, pricing. Persisted to localStorage via `redux-persist` or a custom `localStorageMiddleware`. This slice lives in Redux because it's read by the navbar badge, product listing "add to cart" buttons, the cart page, and the checkout pages — six different components across multiple routes. It must survive navigation.
>
> Checkout wizard slice — the step-by-step flow state. Current step index (1-4), which steps are valid/completed, any data returned from the payment provider (transaction reference for step 4). This is temporary state that isn't persisted — fresh on each checkout attempt. It exists in Redux because the checkout header component and the step content component both need the same current step. Small slice, clear lifetime.
>
> Auth slice — user identity. JWT token, user role, user ID. Needed by RTK Query's `prepareHeaders` to attach the Bearer token to every API call. Persisted in sessionStorage (not localStorage, for security).
>
> Everything else — product catalogue, order history, saved addresses — lives in RTK Query. The checkout flow triggers a `createOrder` mutation. The order confirmation page uses a `useGetOrderQuery`. No extra Redux slices for server data.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Immer means Redux state is mutable now" | "With RTK you can mutate state directly" | Immer mutations are ONLY safe inside `createSlice` reducer functions or an explicit `produce()` call; outside those contexts (inside React components, inside thunks, inside selectors), Redux state is still strictly immutable — never mutate it directly; Immer intercepts mutations ONLY in its protected execution context; accessing `state.items.push(item)` outside a reducer would actually mutate the Redux state object, which breaks Redux DevTools time-travel and causes subtle bugs |
| "RTK Query replaces Redux entirely" | "I use RTK Query so I don't need Redux anymore" | RTK Query handles server state (caching API responses); it does NOT replace Redux for client-owned state; cart contents, authentication tokens, user preferences, UI state (sidebar open, active filter) — these are not server state, they're client state, and they still belong in Redux slices; RTK Query is a server-state cache built ON TOP of Redux, not a replacement for it; the two work together |
| "`createSelector` is always needed" | "I always use createSelector for every selector" | Basic selectors — `state => state.cart.items` — do NOT need `createSelector`; `createSelector` is for DERIVED values that do expensive computation: `items => items.reduce(...)`, `items => items.filter(...)`, `items => items.map(...)`, or combinations of multiple state slices; using `createSelector` for a selector that just returns `state.auth.user` adds overhead with zero benefit; use it when the selector performs work proportional to data size |
| "typed `useSelector` is optional" | "I use `useSelector<RootState>()` inline every time" | Always create typed hooks: `const useAppSelector = useSelector.withTypes<RootState>()` and `const useAppDispatch = useDispatch.withTypes<AppDispatch>()`; these give full TypeScript inference for state shape and dispatch, flag invalid action types at compile time, and eliminate the repetitive `<RootState>` generic on every `useSelector` call; this is listed as a best practice in the official Redux Toolkit documentation |

---

## 7. Hruday's Real Experience Hook
> "Redux Toolkit was the tool that made Redux enjoyable at SAP. We'd inherited a classic Redux codebase where every feature had action type constants, hand-written action creators, and switch-case reducers spread across multiple files. The cognitive load of a simple state change was significant.
>
> The migration to RTK was gradual — we converted slices one at a time over a quarter. The moment I converted the `productsSlice` to use RTK Query instead of the hand-written `createAsyncThunk` approach was the most satisfying refactor of the project. Roughly 180 lines of thunk + loading + error + cache logic collapsed into 30 lines of RTK Query endpoint definition. We immediately got background refetch and request deduplication as a bonus — features we'd never had the time to implement manually.
>
> The SAP Excellence in Frontend Engineering Award citation specifically mentioned the architectural improvement to our state management approach. RTK Query was a significant part of that story."

---

## 8. Scale Evolution

**Small React app →** `createSlice` for cart and auth only; React Query (or RTK Query) for server data; everything else local `useState`; skip `createSelector` for anything small; the full Redux setup is often overkill for <10 pages.

**Medium team app →** RTK Query for all server data (products, orders, user); `createSlice` for client state (cart, auth, feature flags, wizard steps); `createSelector` for any computed value from a list; `redux-persist` for cart and auth token persistence; typed hooks as team standard.

**Large enterprise app (SAP scale) →** domain-split store with named slice files per domain; RTK Query API split by domain (productsApi, ordersApi, userApi) with separate `reducerPath` per API; cache tag strategy refined per entity type (list tags vs individual entity tags); Redux DevTools middleware disabled in production builds; `createEntityAdapter` for normalized list slices.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | RTK Query for payment methods, transaction history, merchant data; cart slice for checkout flow persistence; `createAsyncThunk` for complex payment submission orchestration (multiple API calls + state updates); cache tag invalidation on payment completion to refresh payment status | RTK Query endpoint design with tags; mutation + invalidation for payment status; typed store architecture |
| Swiggy / Meesho | Cart slice with `redux-persist` for cross-session cart recovery; RTK Query for restaurant/product catalogues with `pollingInterval` for real-time availability; `createSelector` for cart total computation; cache invalidation when inventory changes | createSlice for cart; RTK Query polling; createSelector memoization for derived cart state |
| Adobe / Microsoft | Large-scale Redux with complex selectors for document state; RTK Query for cloud asset library; `createEntityAdapter` pattern for normalized document objects; Microsoft interview specifically asks about selector memoization and re-render prevention | createEntityAdapter familiarity; selector memoization depth; RTK Query cache invalidation strategy |
| SAP Labs | Direct experience: migrated to RTK; RTK Query replaced 8 `createAsyncThunk` patterns (400 lines removed); 14-slice production store; SAP Excellence Award partly for state management architecture; team-wide adoption of typed hooks as standard | Real migration story with line counts; RTK Query benefits in production; architectural decision-making |

---

## 10. Related Topics — What to Study Next

- **Topic 224 — Local vs Global State** — RTK is the implementation of global state; this topic answers "when do you use RTK at all?"; the decision framework (local first, global when proven necessary) prevents over-use of RTK for state that should be `useState`
- **Topic 229 — State Normalization** — RTK includes `createEntityAdapter` for normalized list state (keyed by ID rather than arrays); understanding normalization tells you when to reach for `createEntityAdapter` and how it integrates with `createSlice` reducers
- **Topic 227 — TanStack Query / React Query** — the non-RTK alternative for server state; head-to-head comparison helps you justify RTK Query vs React Query in interview discussions; teams not using Redux may prefer React Query since it has no Redux dependency
- **Topic 226 — NgRx** — the Angular equivalent of Redux Toolkit; same concepts (actions, reducers, selectors) but Angular-native with RxJS Effects for async; if you need to answer both React and Angular state management questions, the conceptual parallels between RTK and NgRx are the bridge

---

*Part 13 · Redux Toolkit — createSlice, createAsyncThunk, RTK Query · Full Stack Interview Guide · Hruday D · 2026*
