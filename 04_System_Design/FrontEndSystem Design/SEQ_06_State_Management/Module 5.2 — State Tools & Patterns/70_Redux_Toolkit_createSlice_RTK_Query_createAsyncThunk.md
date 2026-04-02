# 70. Redux Toolkit — createSlice, RTK Query, createAsyncThunk ★

## 1. High-Level Explanation (Frontend Interview Level)

**Redux Toolkit (RTK)** is the official, opinionated toolset for Redux that eliminates the verbosity of vanilla Redux. Three core APIs drive modern Redux usage: `createSlice` (co-locates actions and reducers, generates action creators automatically, uses Immer for safe mutations), `createAsyncThunk` (standardises the async lifecycle: pending/fulfilled/rejected), and `RTK Query` (a complete data-fetching and caching solution built on top of Redux, eliminating the need to write any loading/error/cache state manually). For senior engineers, the key question is not "what is RTK" but "when do you reach for RTK vs TanStack Query vs Zustand" — RTK Query is the right choice when you already have Redux in the app and want collocated data-fetching alongside global state; TanStack Query is framework-agnostic and has a richer ecosystem for stale-time and cache-time configuration.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### createSlice — Co-located Actions and Reducers

```typescript
// Traditional Redux: 3 files (actions, action types, reducer) for one feature
// Redux Toolkit: 1 slice file for the same feature

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CartState {
  items: CartItem[];
  promoCode: string | null;
  isCheckingOut: boolean;
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], promoCode: null, isCheckingOut: false } as CartState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      // Immer allows "mutating" syntax — RTK uses Immer internally
      // Under the hood: state is a Proxy; mutations are recorded and applied immutably
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);   // ← this looks like mutation but is safe
      }
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    applyPromo(state, action: PayloadAction<string>) {
      state.promoCode = action.payload;
    },
    clearCart(state) {
      // Return new state OR mutate proxy — either works, not both
      return { items: [], promoCode: null, isCheckingOut: false };
    },
  },
  // Handle async thunk actions within the slice
  extraReducers: (builder) => {
    builder
      .addCase(submitCheckout.pending, (state) => {
        state.isCheckingOut = true;
      })
      .addCase(submitCheckout.fulfilled, (state) => {
        state.items = [];
        state.isCheckingOut = false;
      })
      .addCase(submitCheckout.rejected, (state) => {
        state.isCheckingOut = false;
      });
  },
});

// RTK generates action creators automatically:
export const { addItem, removeItem, applyPromo, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
```

### createAsyncThunk — Async Lifecycle Standardisation

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';

// createAsyncThunk(typePrefix, payloadCreator)
export const submitCheckout = createAsyncThunk(
  'cart/submitCheckout',           // action type prefix
  async (args: CheckoutArgs, thunkAPI) => {
    try {
      const response = await api.checkout.submit(args);
      return response.data;          // returned value → action.payload in 'fulfilled'
    } catch (error) {
      // Use rejectWithValue to pass a structured error, not the raw Error object
      return thunkAPI.rejectWithValue({
        status: (error as AxiosError).response?.status,
        message: (error as AxiosError).response?.data?.message,
      });
    }
  },
  {
    // Optional condition: skip dispatch if already checking out
    condition: (arg, { getState }) => {
      const state = getState() as RootState;
      return !state.cart.isCheckingOut;  // return false to abort thunk
    },
  }
);

// Generated action types:
// 'cart/submitCheckout/pending'      → dispatched before payloadCreator runs
// 'cart/submitCheckout/fulfilled'    → dispatched on resolve, payload = returned value
// 'cart/submitCheckout/rejected'     → dispatched on throw/rejectWithValue
```

### RTK Query — Cache-First Data Fetching in Redux

RTK Query is a specialised data-fetching + caching layer built into Redux Toolkit. It generates query hooks, manages request deduplication, handles cache invalidation with tag-based typing, and integrates with Redux DevTools:

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const productsApi = createApi({
  reducerPath: 'productsApi',     // where in Redux state this API lives
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Product', 'Category'],  // declares invalidation tag types
  endpoints: (builder) => ({
    // QUERY endpoint — read-only, results cacheable
    listProducts: builder.query<ProductsResponse, ProductFilters>({
      query: (filters) => ({ url: 'products', params: filters }),
      providesTags: (result) => result
        ? [
            ...result.items.map(({ id }) => ({ type: 'Product' as const, id })),
            { type: 'Product', id: 'LIST' },
          ]
        : [{ type: 'Product', id: 'LIST' }],
      // Transform response if API shape differs from app state shape
      transformResponse: (raw: ApiProductsResponse) => ({
        items: raw.data.products,
        totalCount: raw.data.meta.total,
      }),
    }),
    
    // MUTATION endpoint — writes data
    createProduct: builder.mutation<Product, CreateProductArgs>({
      query: (body) => ({ url: 'products', method: 'POST', body }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
      // Optimistic update
      onQueryStarted: async (args, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          productsApi.util.updateQueryData('listProducts', {}, (draft) => {
            draft.items.push({ id: 'optimistic', ...args } as Product);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();    // rollback optimistic update on failure
        }
      },
    }),
  }),
});

// Auto-generated hooks:
export const { useListProductsQuery, useCreateProductMutation } = productsApi;
```

### Store Setup with RTK Query

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

export const store = configureStore({
  reducer: {
    cart: cartSlice.reducer,
    auth: authSlice.reducer,
    [productsApi.reducerPath]: productsApi.reducer,  // API has its own reducer slice
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(productsApi.middleware),  // required for cache management + invalidation
});

// Enable refetchOnFocus/refetchOnReconnect behaviours
setupListeners(store.dispatch);
```

### RTK Query vs TanStack Query

| Criterion | RTK Query | TanStack Query |
|---|---|---|
| Already using Redux? | Yes — natural choice | Also fine — separate from Redux |
| Co-location with global state | Yes — shares Redux store | No — its own cache |
| Framework | React only (react adapter) | React, Vue, Angular, Svelte |
| Normalised cache | No — does whole query invalidation | No — same: invalidate by key |
| Advanced cache config (staleTime, gcTime) | Limited | Rich, per-query configuration |
| DevTools | Redux DevTools | TanStack Query Devtools |
| Bundle size | Already paid if using Redux | ~13KB extra |

---

## 3. Real-World Examples

**Shopify Admin (React+Redux):** RTK Query powers product, order, and customer data fetching. The `providesTags`/`invalidatesTags` pattern ensures that creating a product invalidates the product list cache, and the UI updates immediately via the invalidation system.

**LinkedIn Feed:** Redux Toolkit manages both UI state (sidebar collapsed, modals open) and server state (feed posts). `createAsyncThunk` handles the feed pagination with pending/fulfilled/rejected lifecycle; the Redux DevTools time-travel is invaluable for debugging feed ordering issues.

**At Hruday's SAP context:** SAP Fiori applications that were migrated from UI5 to React often bring Redux for state management.  `createSlice` for OData entity management (stories, dimensions, filters) with `createAsyncThunk` for OData reads/writes maps perfectly to the existing saga-heavy architecture. The `extraReducers` builder pattern handles the async lifecycle cleanly without action type string constants.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "Redux Toolkit gives us three key tools: `createSlice` co-locates action creators and reducers, using Immer under the hood so we can write mutation-style reducer logic without actually mutating state. `createAsyncThunk` standardises async lifecycle to pending/fulfilled/rejected and gives us `rejectWithValue` for structured error handling in the rejected handler. RTK Query is a full data-fetching solution — similar to TanStack Query but living inside Redux, sharing the store. It uses tag-based cache invalidation: queries `providesTags`, mutations `invalidatesTags`, and the middleware coordinates the lifecycle. When I already have Redux in the app, I reach for RTK Query to avoid the parallel cache. When the app is query-heavy with no global state, I'd skip Redux entirely and use TanStack Query standalone."

**Likely Follow-up Questions:**
1. Why does Immer enable mutation-style code in reducers? → Immer wraps the state in a JavaScript Proxy that records all property writes. When the reducer function returns, Immer produces a new immutable state from those recorded writes. No actual mutation occurs to the production object.
2. What's `createEntityAdapter`? → RTK utility for normalised CRUD state. Generates a normalised store shape `{ ids: string[], entities: Record<string, Entity> }` and provides pre-built reducers: `addOne`, `addMany`, `updateOne`, `removeOne`, `setAll`. Eliminates hand-writing normalisation logic.
3. When would you NOT use RTK Query? → Heavy offline-first / persistent caching requirements (TanStack Query's `persistQueryClient` is more flexible), framework-agnostic codebase (TanStack Query supports Vue, Angular, Svelte), advanced stale-time per-query control, or when you don't have Redux and don't want to add it.

---

## 5. Code Example

```typescript
// Practical: paginated products list with polling for live inventory

export const inventoryApi = createApi({
  reducerPath: 'inventoryApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Inventory'],
  endpoints: (builder) => ({
    getInventory: builder.query<InventoryPage, { page: number; sku?: string }>({
      query: (params) => ({ url: '/inventory', params }),
      providesTags: (result) =>
        result
          ? result.items.map(({ id }) => ({ type: 'Inventory' as const, id }))
          : ['Inventory'],
      // Merge pages for infinite scroll via serializeQueryArgs + merge
      serializeQueryArgs: ({ queryArgs }) => queryArgs.sku ?? 'all',
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === 1) return newItems;    // reset on new search
        currentCache.items.push(...newItems.items);
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.page !== previousArg?.page,
    }),
  }),
});

// In component:
function InventoryList({ sku }: { sku?: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useGetInventoryQuery(
    { page, sku },
    { pollingInterval: 30_000 }    // refresh every 30 sec, keeps inventory live
  );
  
  return (
    <>
      {data?.items.map((item) => <InventoryRow key={item.id} {...item} />)}
      {isFetching && <Spinner />}
      <Button onClick={() => setPage(p => p + 1)}>Load more</Button>
    </>
  );
}
```

---

## 6. Memory Aid

**createSlice = actions + reducer in one.** State in, action in, new state out — Immer makes mutation-style writing safe.

**createAsyncThunk = promise → 3 action types.** Your `async` function returns value → `fulfilled`. Throws or `rejectWithValue` → `rejected`. While running → `pending`.

**RTK Query = Redux-native TanStack Query.** `providesTags` marks cache entries. `invalidatesTags` blows selected entries. Middleware connects them.

---

## 7. Why & How Summary

**Why it matters:** Redux Toolkit eliminated the primary criticism of Redux (excessive boilerplate) while preserving its benefits (predictable state, excellent DevTools, time-travel debugging). RTK Query eliminates the second-biggest Redux pain point — async data management — making Redux a complete state solution rather than half a solution.

**How it works:** `createSlice` calls Immer's `produce()` internally for each case reducer. `createAsyncThunk` wraps an async function and dispatches three action type strings based on promise state. RTK Query generates reducers and middleware that populate a Redux slice with normalised cache entries, keyed by query arguments; the middleware intercepts cache tag changes and triggers refetches for invalidated subscriptions.

**Company relevance:**
- Microsoft: Azure DevOps and Teams web apps use Redux extensively — RTK is the standard Redux pattern there
- Adobe: Experience Platform uses Redux Toolkit for complex workflow state management — `createEntityAdapter` manages large entity collections
- Salesforce: Experience Cloud (Community) apps use Redux for page builder state; RTK Query handles component data from Salesforce APIs
- Cisco: Webex administration portals use Redux for organisation/user state; createAsyncThunk manages async policy applications
