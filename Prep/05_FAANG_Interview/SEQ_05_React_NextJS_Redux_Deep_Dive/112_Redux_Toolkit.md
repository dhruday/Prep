# 112. Redux Toolkit — createSlice, createAsyncThunk, createEntityAdapter
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Redux Toolkit (RTK) is the official, opinionated way to write Redux — it eliminates the boilerplate that made vanilla Redux verbose. Three core APIs: `createSlice` combines action types, action creators, and reducer in one declaration using Immer for mutable-syntax immutable updates; `createAsyncThunk` generates `pending/fulfilled/rejected` lifecycle actions for async operations with automatic error handling; `createEntityAdapter` provides normalized state management (ID-based lookup, sorted collections) with pre-built CRUD reducers and memoized selectors. RTK is the standard for all new Redux code, and legacy vanilla Redux is always a migration target toward RTK.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### createSlice — The Core of RTK

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CartItem { id: string; name: string; price: number; quantity: number }
interface CartState { items: CartItem[]; loading: boolean; error: string | null }

const cartSlice = createSlice({
  name: 'cart',          // prefix for action type strings: 'cart/addItem'
  initialState: {
    items: [],
    loading: false,
    error: null,
  } as CartState,

  reducers: {
    // ✅ Immer: write mutable code → RTK produces immutable update
    addItem(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        existing.quantity += 1;   // ← direct mutation — safe with Immer
      } else {
        state.items.push(action.payload);  // ← direct mutation — safe
      }
    },

    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },

    updateQuantity(state, action: PayloadAction<{ id: string; quantity: number }>) {
      const item = state.items.find(i => i.id === action.payload.id);
      if (item) item.quantity = action.payload.quantity;
    },

    clearCart(state) {
      state.items = [];
      // Or: return initialState; — both patterns work
    },

    // Prepare callback: transform payload before reaching reducer
    discountItem: {
      prepare(id: string, discountPercent: number) {
        return { payload: { id, discountPercent, appliedAt: Date.now() } };
      },
      reducer(state, action: PayloadAction<{ id: string; discountPercent: number; appliedAt: number }>) {
        const item = state.items.find(i => i.id === action.payload.id);
        if (item) {
          item.price = item.price * (1 - action.payload.discountPercent / 100);
        }
      },
    },
  },

  // extraReducers: handle actions from OTHER slices or createAsyncThunk
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action: PayloadAction<CartItem[]>) => {
        state.loading = false;
        state.items = action.payload;  // Immer handles immutability
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string ?? 'Unknown error';
      });
  },
});

// Slice exports action creators and reducer
export const { addItem, removeItem, updateQuantity, clearCart } = cartSlice.actions;
export const cartReducer = cartSlice.reducer;

// Action type strings (auto-generated):
// 'cart/addItem', 'cart/removeItem', 'cart/updateQuantity', 'cart/clearCart'
```

### createAsyncThunk — Async Operations

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../store';

// Typed thunk API config (avoids casting)
interface ThunkConfig {
  state: RootState;
  dispatch: AppDispatch;
  rejectValue: string;   // type of action.payload in rejected case
}

// createAsyncThunk(typePrefix, payloadCreator, options)
export const fetchCart = createAsyncThunk<
  CartItem[],    // return type on success → action.payload in fulfilled
  string,        // arg type (userId)
  ThunkConfig
>(
  'cart/fetchCart',   // base action type → generates pending/fulfilled/rejected
  async (userId, { getState, dispatch, rejectWithValue, signal }) => {
    // signal: AbortController signal for cancellation
    const response = await fetch(`/api/cart/${userId}`, { signal });
    if (!response.ok) {
      // rejectWithValue: sends typed payload to rejected.payload (NOT to error)
      return rejectWithValue(`Failed to fetch cart: ${response.statusText}`);
    }
    return response.json() as Promise<CartItem[]>;
  }
);

// Auto-generated action creators:
// fetchCart.pending  → { type: 'cart/fetchCart/pending' }
// fetchCart.fulfilled → { type: 'cart/fetchCart/fulfilled', payload: CartItem[] }
// fetchCart.rejected  → { type: 'cart/fetchCart/rejected', payload?: string }

// ========================
// Conditional fetch + request deduplication
// ========================
export const fetchCartIfNeeded = createAsyncThunk<CartItem[], string, ThunkConfig>(
  'cart/fetchCartIfNeeded',
  async (userId, { dispatch, getState }) => {
    return dispatch(fetchCart(userId)).unwrap();  // re-use base thunk
  },
  {
    // Skip dispatch entirely if condition returns false
    condition: (userId, { getState }) => {
      const state = getState();
      const { loading, items } = state.cart;
      // If already loading or we have data, don't dispatch
      return !loading && items.length === 0;
    },
  }
);

// ========================
// Usage: .unwrap() to treat like a promise
// ========================
async function handleAddToCart(productId: string) {
  try {
    await dispatch(fetchCart(userId)).unwrap();
    // .unwrap() throws if rejected (unlike default behavior of returning rejected action)
    dispatch(addItem({ id: productId, name: 'Widget', price: 9.99, quantity: 1 }));
  } catch (error) {
    console.error('Cart fetch failed:', error);
  }
}
```

### createEntityAdapter — Normalized State

```typescript
import { createEntityAdapter, createSlice, createSelector } from '@reduxjs/toolkit';

interface Product {
  id: string;  // EntityAdapter uses 'id' field by default
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

// EntityAdapter: manages normalized lookup table
const productsAdapter = createEntityAdapter<Product>({
  // Optional: sort order for selectAll
  sortComparer: (a, b) => a.name.localeCompare(b.name),
  // Optional: custom ID field (if not 'id')
  // selectId: (product) => product.sku,
});

// State shape managed by adapter:
// { ids: ['p1', 'p2', 'p3'], entities: { p1: {...}, p2: {...}, p3: {...} } }
interface ProductsState {
  status: 'idle' | 'loading' | 'error';
  error: string | null;
}

const productsSlice = createSlice({
  name: 'products',
  initialState: productsAdapter.getInitialState<ProductsState>({
    status: 'idle',
    error: null,
  }),

  reducers: {
    // Adapter provides pre-built CRUD operations
    productAdded: productsAdapter.addOne,
    productsAdded: productsAdapter.addMany,
    productUpdated: productsAdapter.upsertOne,
    productRemoved: productsAdapter.removeOne,
    productsReset: productsAdapter.setAll,
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'idle';
        // setAll: replace entire collection
        productsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Fetch failed';
      });
  },
});

// Adapter generates memoized selectors
const productSelectors = productsAdapter.getSelectors<RootState>(
  (state) => state.products
);

export const {
  selectAll: selectAllProducts,      // returns sorted array
  selectById: selectProductById,     // returns single item or undefined
  selectIds: selectProductIds,       // returns IDs array
  selectTotal: selectProductCount,   // returns count
  selectEntities: selectProductMap,  // returns the entities lookup object
} = productSelectors;

// Composed selector using adapter selectors
export const selectInStockProducts = createSelector(
  selectAllProducts,
  (products) => products.filter(p => p.inStock)
);

export const { productAdded, productsAdded, productUpdated, productRemoved } = productsSlice.actions;
export const productsReducer = productsSlice.reducer;

// ========================
// Why normalization matters
// ========================
// ❌ Array-based state: O(n) lookup for every render
//   items.find(p => p.id === productId)  → scans entire array

// ✅ Normalized state: O(1) lookup
//   state.products.entities[productId]  → direct hash lookup
// Critical for lists with 500+ items
```

### Store Configuration with RTK

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { cartReducer } from './cartSlice';
import { productsReducer } from './productsSlice';
import { userReducer } from './userSlice';

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    products: productsReducer,
    user: userReducer,
  },
  // configureStore includes: redux-thunk, redux-devtools-extension, serializability check, immutability check
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable serializable check for known non-serializable values
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['some.non.serializable.path'],
      },
    }),
    // .concat(customMiddleware) to add more
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks (define once, use everywhere — avoids per-component casting)
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP Labs, migrating from vanilla Redux to RTK: `createSlice` replaced ~150 lines of action type constants + action creators + switch statement reducer with ~40 lines. `createEntityAdapter` for the product catalog (30,000 SKUs) eliminated the O(n) `.find()` in `mapStateToProps` that was causing render delays — direct `entities[id]` lookup dropped selector time from ~8ms to ~0.1ms (profiled in React DevTools). `createAsyncThunk` with `condition` for deduplication prevented the "double fetch on tab switch" bug in the dashboard.

**At FAANG scale:**
- **Microsoft:** Azure Portal team's blog notes RTK migration eliminated ~40% of Redux-related boilerplate; `createEntityAdapter` for resource lists (VMs, storage accounts, etc.)
- **Adobe:** Experience Cloud switched to RTK for new features; `createAsyncThunk` with `rejectWithValue` feeding standardized error UIs
- **Salesforce:** Trailhead learning platform uses `createEntityAdapter` for module listings (thousands of items in normalized state)
- **Cisco:** DevNet portal uses RTK `createSlice` for all new feature state; legacy connect() HOCs being replaced with RTK hooks (`useAppSelector`, `useAppDispatch`)

---

## 💬 4. Interview Execution

### Sample Answer

> "Redux Toolkit is the official, opinionated wrapper around Redux that eliminates the boilerplate. The three APIs I use daily:
>
> `createSlice` — combines action types, action creators, and reducer in one place, using Immer under the hood so you write `state.items.push(item)` instead of `[...state.items, item]` in every reducer branch.
>
> `createAsyncThunk` — handles the `pending`/`fulfilled`/`rejected` action lifecycle for async operations. I use `rejectWithValue` to send typed error payloads to the rejected case rather than using the error property. `.unwrap()` on the dispatched thunk lets me treat it like a Promise with try/catch in components.
>
> `createEntityAdapter` — normalizes collections into an id-indexed lookup table. This is critical for performance on large lists — direct `entities[id]` lookup instead of O(n) `.find()`. The adapter also provides pre-built CRUD reducers (`addOne`, `upsertOne`, `removeOne`) and memoized selectors (`selectAll`, `selectById`).
>
> The store is configured with `configureStore` — it sets up Immer, thunk, and Redux DevTools automatically. I always extract typed hooks (`useAppDispatch`, `useAppSelector`) for full TypeScript coverage throughout the app."

---

## 💻 5. Code Example

```typescript
// ========================
// Complete slice: notifications feature
// Demonstrates all three: createSlice + createAsyncThunk + createEntityAdapter
// ========================
import {
  createSlice, createAsyncThunk, createEntityAdapter,
  createSelector, PayloadAction
} from '@reduxjs/toolkit';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

// — Entity adapter for normalized notification storage —
const notificationsAdapter = createEntityAdapter<Notification>({
  sortComparer: (a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
});

interface NotificationsState {
  status: 'idle' | 'loading' | 'error';
  error: string | null;
  unreadCount: number;
}

// — Async thunk —
export const fetchNotifications = createAsyncThunk<
  Notification[],
  void,
  { rejectValue: string }
>(
  'notifications/fetchAll',
  async (_, { rejectWithValue }) => {
    const response = await fetch('/api/notifications');
    if (!response.ok) return rejectWithValue(response.statusText);
    return response.json();
  }
);

export const markAsRead = createAsyncThunk<string, string, { rejectValue: string }>(
  'notifications/markAsRead',
  async (notificationId, { rejectWithValue }) => {
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
    if (!response.ok) return rejectWithValue(response.statusText);
    return notificationId;
  }
);

// — Slice —
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: notificationsAdapter.getInitialState<NotificationsState>({
    status: 'idle',
    error: null,
    unreadCount: 0,
  }),

  reducers: {
    notificationReceived(state, action: PayloadAction<Notification>) {
      notificationsAdapter.addOne(state, action.payload);
      if (!action.payload.read) state.unreadCount += 1;
    },

    allNotificationsRead(state) {
      Object.values(state.entities).forEach(n => {
        if (n) n.read = true;
      });
      state.unreadCount = 0;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, state => { state.status = 'loading'; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'idle';
        notificationsAdapter.setAll(state, action.payload);
        state.unreadCount = action.payload.filter(n => !n.read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Failed to fetch';
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        notificationsAdapter.updateOne(state, {
          id: action.payload,
          changes: { read: true },
        });
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      });
  },
});

// — Selectors —
const notificationSelectors = notificationsAdapter.getSelectors<RootState>(
  s => s.notifications
);
export const { selectAll: selectAllNotifications, selectById: selectNotificationById } =
  notificationSelectors;

export const selectUnreadCount = (state: RootState) => state.notifications.unreadCount;
export const selectUnreadNotifications = createSelector(
  selectAllNotifications,
  notifications => notifications.filter(n => !n.read)
);

export const { notificationReceived, allNotificationsRead } = notificationsSlice.actions;
export const notificationsReducer = notificationsSlice.reducer;

// Type stubs
type RootState = { notifications: ReturnType<typeof notificationsSlice.reducer> };
```

---

## 🧠 6. Memory Aid

**RTK = Redux without the ceremony.**

**Three tools, three jobs:**
- `createSlice` = define state shape + all its transitions in one block
- `createAsyncThunk` = async operation with auto-lifecycle (pending/fulfilled/rejected)
- `createEntityAdapter` = normalized collection with built-in CRUD + selectors

**Immer in reducers:** "write mutations, get immutability" — the reason you can push to arrays in RTK reducers.

**rejectWithValue vs error:** `rejectWithValue('message')` → `action.payload`; unhandled throw → `action.error.message` (serialized). Always use `rejectWithValue` for typed error UIs.

**Mnemonic:** **SAE** — **S**lice for synchronous state, **A**syncThunk for async lifecycle, **E**ntityAdapter for normalized collections.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Boilerplate elimination: RTK `createSlice` reduces a typical feature's Redux code from 150+ lines to 40-50 lines — at SAP scale (30+ features), this is thousands of lines removed, and the remaining code is consistently structured and easier to review
→ Immer safety: the mutation-style syntax prevents the class of bug where developers accidentally mutate state directly (very common in plain Redux) — Immer freezes state in development to catch any accidental mutation immediately
→ `createEntityAdapter` is the interview differentiator: knowing normalized state (id lookup vs array scan) and the O(1) vs O(n) performance difference signals deep Redux architecture knowledge

**How it works (2 sentences):**
`createSlice` uses `createReducer` internally, which wraps each case function with Immer's `produce` — this means the reducer function receives an Immer "draft proxy" as `state`, mutations on the draft are tracked, and Immer produces a new immutable state tree when the function returns, allowing mutable-looking syntax while preserving Redux's core immutability contract.
`createEntityAdapter` implements the normalized state pattern by maintaining two parallel data structures: an `ids` array (for ordered iteration) and an `entities` map (for O(1) lookup by ID), and its memoized selectors (`selectAll`, `selectById`) are built on `createSelector`, ensuring they only recompute when the underlying entities data changes.

---
✅ Topic 112/486 complete → Continuing to Topic 113: RTK Query — defineApi, endpoints, caching, invalidation
