# 113. RTK Query — defineApi, Endpoints, Caching, Invalidation
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

RTK Query is a server-state data fetching and caching library built into Redux Toolkit. It eliminates the manual `loading/error/data` state management that `createAsyncThunk` requires by automatically generating React hooks for every endpoint: `useGetProductsQuery`, `useAddProductMutation`, etc. The core concepts: `createApi` defines your endpoints; each endpoint is either a **query** (data fetching with automatic caching) or a **mutation** (write operations that trigger cache invalidation). Caching works via **tags** — queries declare what tags they provide, mutations declare what tags they invalidate, and RTK Query automatically refetches tagged queries after mutations complete. RTK Query stores its cache in the Redux store, making it DevTools-visible and debuggable.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Defining an API with createApi

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Define the API — single definition, auto-generates hooks
export const productApi = createApi({
  reducerPath: 'productApi',  // where in Redux store the cache lives
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      // Inject auth token from Redux state
      const token = (getState() as RootState).auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),

  // Tags: named groups used to link queries and mutations
  tagTypes: ['Product', 'Cart', 'User'],

  endpoints: (builder) => ({
    // ========================
    // QUERY: fetching data with caching
    // ========================
    getProducts: builder.query<Product[], { category?: string }>({
      query: ({ category }) =>
        category ? `/products?category=${category}` : '/products',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Product' as const, id })),
              { type: 'Product', id: 'LIST' },  // "the list itself" tag
            ]
          : [{ type: 'Product', id: 'LIST' }],
    }),

    getProductById: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),

    // ========================
    // MUTATION: write operations that invalidate cache
    // ========================
    addProduct: builder.mutation<Product, NewProduct>({
      query: (body) => ({
        url: '/products',
        method: 'POST',
        body,
      }),
      // invalidatesTags: triggers refetch of queries providing these tags
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),

    updateProduct: builder.mutation<Product, Partial<Product> & { id: string }>({
      query: ({ id, ...patch }) => ({
        url: `/products/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      // Invalidate both the specific item and the list
      invalidatesTags: (result, error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
      ],
    }),

    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
      ],
    }),
  }),
});

// Auto-generated typed hooks — use like React hooks in components
export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApi;
```

### Store Integration

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { productApi } from './productApi';
import { cartApi } from './cartApi';

export const store = configureStore({
  reducer: {
    // Client state (standard Redux slices)
    auth: authReducer,
    ui: uiReducer,

    // Server state (RTK Query slice — auto-manages cache)
    [productApi.reducerPath]: productApi.reducer,
    [cartApi.reducerPath]: cartApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(productApi.middleware)  // required: manages cache lifetime
      .concat(cartApi.middleware),
});
```

### Using Queries in Components

```typescript
function ProductList({ category }: { category?: string }) {
  // Auto-generated hook: fetches, caches, and subscribes to updates
  const {
    data: products,           // undefined until data arrives
    isLoading,                // true on first fetch (no cached data)
    isFetching,               // true on any fetch (including background refetch)
    isError,
    error,
    refetch,                  // manual refetch
  } = useGetProductsQuery({ category }, {
    // Options:
    pollingInterval: 60000,              // refetch every 60s
    refetchOnMountOrArgChange: true,     // refetch when component mounts
    refetchOnFocus: true,                // refetch when window regains focus
    skip: !category,                     // skip if condition not met
  });

  // isLoading vs isFetching:
  // isLoading: only true the FIRST time (no data yet) → show skeleton
  // isFetching: true on ANY background refetch → show "refreshing" indicator

  if (isLoading) return <ProductSkeleton />;
  if (isError) return <ErrorMessage error={error} />;

  return (
    <div>
      {isFetching && <RefreshIndicator />}
      <ul>
        {products?.map(p => <ProductCard key={p.id} product={p} />)}
      </ul>
    </div>
  );
}
```

### Optimistic Updates — Mutations

```typescript
function useUpdateProductOptimistic() {
  const [updateProduct] = useUpdateProductMutation();

  const handleUpdate = async (id: string, patch: Partial<Product>) => {
    // Option 1: fire-and-forget (simplest)
    updateProduct({ id, ...patch });

    // Option 2: async with error handling
    try {
      await updateProduct({ id, ...patch }).unwrap();
      showToast('Product updated');
    } catch (err) {
      showToast('Update failed', 'error');
    }
  };

  return handleUpdate;
}

// Option 3: Optimistic updates (update UI before server confirms)
const productsApi = createApi({
  // ...
  endpoints: (builder) => ({
    updateProduct: builder.mutation<Product, Partial<Product> & { id: string }>({
      query: ({ id, ...patch }) => ({
        url: `/products/${id}`,
        method: 'PATCH',
        body: patch,
      }),

      // onQueryStarted: runs before the request completes
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        // Optimistically update the cache BEFORE the server responds
        const patchResult = dispatch(
          productsApi.util.updateQueryData('getProductById', id, (draft) => {
            // Immer draft — modify directly
            Object.assign(draft, patch);
          })
        );

        try {
          await queryFulfilled;  // wait for server confirmation
        } catch {
          // Server rejected: rollback the optimistic update
          patchResult.undo();
        }
      },

      invalidatesTags: (result, error, { id }) => [{ type: 'Product', id }],
    }),
  }),
});
```

### Cache Lifetime and Deduplication

```typescript
const productApi = createApi({
  // ...
  keepUnusedDataFor: 60,  // seconds to keep cache after all subscribers unmount (default: 60)

  endpoints: (builder) => ({
    getProduct: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      keepUnusedDataFor: 300,  // override per endpoint: 5 min for products
    }),
  }),
});

// Key RTK Query behaviors:
// 1. Deduplication: two components mounting simultaneously with same args
//    → only ONE request made, both share the cached result

// 2. Subscription counting: cache kept while any component subscribes
//    → unmount last subscriber: countdown begins (keepUnusedDataFor)
//    → remount within countdown: no new fetch (cached data immediately)

// 3. Background refetch: stale data refetched when window refocuses (if configured)
//    → isFetching=true while refetching; data still shows (stale-while-revalidate)
```

### Manual Cache Manipulation

```typescript
function useProductActions() {
  const dispatch = useDispatch();

  // Manually update cache without a mutation
  function updateProductLocally(id: string, changes: Partial<Product>) {
    dispatch(
      productApi.util.updateQueryData('getProducts', {}, (draft) => {
        const product = draft.find(p => p.id === id);
        if (product) Object.assign(product, changes);
      })
    );
  }

  // Force invalidate tags (triggers refetch)
  function invalidateAllProducts() {
    dispatch(productApi.util.invalidateTags(['Product']));
  }

  // Prefetch: manually seed the cache before user navigates to a page
  const prefetch = productApi.usePrefetch('getProductById');
  function prefetchProduct(id: string) {
    prefetch(id, { ifOlderThan: 30 });  // only prefetch if cache is >30s old
  }

  return { updateProductLocally, invalidateAllProducts, prefetchProduct };
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the order management module had ~40 `createAsyncThunk` actions, each with manual `loading`/`error` state in the reducer. Migrating to RTK Query: the 40 thunks + their reducer cases + `mapStateToProps` checks collapsed into ~12 endpoint definitions in one `createApi` call. The tag-based invalidation automated what was previously complex manual state coordination ("when the order is saved, also refetch the order list and the dashboard totals"). Background refetch on window focus eliminated stale data issues that users previously reported after switching tabs for 10+ minutes.

**At FAANG scale:**
- **Microsoft:** Azure Portal uses RTK Query pattern for resource management API calls — tag-based invalidation for grouping resource types (all `VirtualMachine` tagged queries invalidated when a VM is modified)
- **Adobe:** Experience Platform's segment builder uses RTK Query for auto-invalidating preview estimates when segment conditions change
- **Salesforce:** Einstein Analytics uses RTK Query for dashboard data — `pollingInterval` for real-time KPI tiles, optimistic updates for in-app edits
- **Cisco:** DevNet sandbox provisioning uses RTK Query with `pollingInterval` to check provisioning status (progress updates every 5 seconds)

---

## 💬 4. Interview Execution

### Sample Answer

> "RTK Query is Redux Toolkit's built-in server-state solution. Where `createAsyncThunk` requires you to manually manage loading, error, and data state in reducers, RTK Query generates all of that automatically.
>
> The pattern: `createApi` defines your data source with `baseQuery` and `endpoints`. Each endpoint is either a query (fetch + cache) or a mutation (write + invalidate). The cache uses a tag system — queries declare what tags they `provide`, mutations declare what tags they `invalidate`, and RTK Query automatically refetches tagged queries when mutations complete. This decouples reads from writes elegantly.
>
> The hook naming is automatic: `getProducts` endpoint → `useGetProductsQuery` + `useLazyGetProductsQuery` hooks. Each hook returns `data`, `isLoading`, `isFetching`, `error` — with a critical distinction: `isLoading` is only true the first time (show skeleton); `isFetching` is true on any request (show refresh indicator).
>
> For optimistic updates, `onQueryStarted` lets you update the cache before the server responds and roll back with `patchResult.undo()` if the request fails — same pattern as similar libraries but with full Redux DevTools visibility since the cache lives in the Redux store."

---

## 💻 5. Code Example

```typescript
// ========================
// E-commerce checkout: products + cart with full invalidation
// ========================
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface Product { id: string; name: string; price: number; stock: number }
interface CartItem { productId: string; quantity: number }
interface Cart { id: string; items: CartItem[]; total: number }

export const shopApi = createApi({
  reducerPath: 'shopApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Product', 'Cart'],

  endpoints: (builder) => ({
    // Products
    getProducts: builder.query<Product[], void>({
      query: () => '/products',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Product' as const, id })), 'Product']
          : ['Product'],
    }),

    // Cart
    getCart: builder.query<Cart, void>({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),

    addToCart: builder.mutation<Cart, { productId: string; quantity: number }>({
      query: (body) => ({ url: '/cart/items', method: 'POST', body }),
      invalidatesTags: ['Cart'],  // refetch cart + product (updates stock)
      // Optimistic update: instant UI feedback
      async onQueryStarted({ productId, quantity }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          shopApi.util.updateQueryData('getCart', undefined, (draft) => {
            const existing = draft.items.find(i => i.productId === productId);
            if (existing) {
              existing.quantity += quantity;
            } else {
              draft.items.push({ productId, quantity });
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    removeFromCart: builder.mutation<Cart, string>({
      query: (productId) => ({ url: `/cart/items/${productId}`, method: 'DELETE' }),
      invalidatesTags: ['Cart'],
    }),

    checkout: builder.mutation<{ orderId: string }, void>({
      query: () => ({ url: '/cart/checkout', method: 'POST' }),
      invalidatesTags: ['Cart', 'Product'],  // checkout clears cart + updates stock
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetCartQuery,
  useAddToCartMutation,
  useRemoveFromCartMutation,
  useCheckoutMutation,
} = shopApi;

// ========================
// Component usage
// ========================
function CartPage() {
  const { data: cart, isLoading } = useGetCartQuery();
  const [removeFromCart, { isLoading: isRemoving }] = useRemoveFromCartMutation();
  const [checkout, { isLoading: isCheckingOut, isSuccess }] = useCheckoutMutation();

  if (isLoading) return <div>Loading cart...</div>;
  if (!cart || cart.items.length === 0) return <div>Your cart is empty</div>;
  if (isSuccess) return <div>Order placed!</div>;

  return (
    <div>
      <h1>Cart ({cart.items.length} items)</h1>
      {cart.items.map(item => (
        <div key={item.productId}>
          <span>Product {item.productId} × {item.quantity}</span>
          <button
            onClick={() => removeFromCart(item.productId)}
            disabled={isRemoving}
          >
            Remove
          </button>
        </div>
      ))}
      <p>Total: ${cart.total.toFixed(2)}</p>
      <button onClick={() => checkout()} disabled={isCheckingOut}>
        {isCheckingOut ? 'Processing...' : 'Checkout'}
      </button>
    </div>
  );
}

// Type stubs
type RootState = any;
```

---

## 🧠 6. Memory Aid

**RTK Query = "firebase-style reactive data, but backed by your own API"**

**Tag lifecycle:**
1. Query runs → `providesTags: ['Product', { type: 'Product', id: '123' }]`
2. Mutation runs → `invalidatesTags: [{ type: 'Product', id: '123' }]`
3. RTK Query sees overlap → automatically triggers refetch of tagged queries

**isLoading vs isFetching:**
- `isLoading` = first ever fetch (no data yet) → show skeleton
- `isFetching` = any active request (data exists but refreshing) → show spinner overlay

**keepUnusedDataFor:** cache timeout after last subscriber unmounts (default 60s).

**Mnemonic:** **EPIC** — **E**ndpoints define queries/mutations, **P**rovide tags on reads, **I**nvalidate tags on writes, **C**ache stays until timeout.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ RTK Query eliminates an entire category of code: loading/error/data state in reducers, `useEffect` for fetching, manual invalidation logic when mutations occur — a typical feature needs ~80% less Redux code after migration
→ Tag-based invalidation is the interview differentiator: understanding how `providesTags` and `invalidatesTags` form a reactive contract (query re-fetches automatically after the right mutation) demonstrates architectural thinking beyond "just fetch data in useEffect"
→ Cache deduplication: two sibling components with the same query args share ONE request and ONE cache entry — not understanding this leads to anti-patterns like disabling caching to avoid "duplicate data"

**How it works (2 sentences):**
RTK Query stores all cached data as entries in the Redux store keyed by the endpoint name and serialized arguments hash; each query subscribes to its cache entry and the React hook returns the current data, and when a mutation's `invalidatesTags` overlaps with any query's `providesTags`, RTK Query marks those cache entries as invalid and immediately triggers a refetch for all active subscribers.
The middleware component manages cache subscription counting — it increments a subscriber count when a component mounts with a query hook and decrements it on unmount, and after all subscribers unmount, it starts a `keepUnusedDataFor` countdown before removing the cache entry, enabling instant data for components that remount before the countdown expires.

---
✅ Topic 113/486 complete → Continuing to Topic 114: Redux Middleware — Thunk vs Saga vs Observable
