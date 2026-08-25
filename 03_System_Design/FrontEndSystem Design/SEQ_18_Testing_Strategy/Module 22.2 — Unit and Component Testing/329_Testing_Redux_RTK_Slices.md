# 329 – Testing Redux / RTK Slices in Isolation

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Redux slices (reducers + actions) are pure functions — perfect for unit testing. Test the **reducer** with state + action → new state. Test **selectors** with sample state. Test **thunks/async** with a mock store. RTK Query endpoints test with MSW (Mock Service Worker).

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
import { configureStore } from '@reduxjs/toolkit';
import cartSlice, { addItem, removeItem, selectCartTotal } from './cartSlice';

// ──── TESTING REDUCERS ────
describe('cartSlice reducer', () => {
  const initialState = { items: [], total: 0 };
  
  it('adds item', () => {
    const item = { id: '1', name: 'Widget', price: 29.99, qty: 1 };
    const state = cartSlice(initialState, addItem(item));
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual(item);
  });

  it('removes item', () => {
    const stateWithItem = { items: [{ id: '1', name: 'Widget', price: 29.99, qty: 1 }], total: 29.99 };
    const state = cartSlice(stateWithItem, removeItem('1'));
    expect(state.items).toHaveLength(0);
  });

  it('handles unknown action', () => {
    const state = cartSlice(initialState, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });
});

// ──── TESTING SELECTORS ────
describe('selectors', () => {
  const state = {
    cart: { items: [
      { id: '1', price: 10, qty: 2 },
      { id: '2', price: 20, qty: 1 },
    ], total: 0 },
  };

  it('calculates total', () => {
    expect(selectCartTotal(state)).toBe(40); // 10*2 + 20*1
  });
});

// ──── TESTING ASYNC THUNKS ────
import { createAsyncThunk } from '@reduxjs/toolkit';
const fetchProducts = createAsyncThunk('products/fetch', async () => {
  const res = await fetch('/api/products');
  return res.json();
});

describe('fetchProducts thunk', () => {
  it('dispatches fulfilled on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve([{ id: '1', name: 'Widget' }]),
    });
    
    const store = configureStore({ reducer: { products: productsReducer } });
    await store.dispatch(fetchProducts());
    
    const state = store.getState().products;
    expect(state.items).toHaveLength(1);
    expect(state.status).toBe('idle');
  });

  it('dispatches rejected on failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    const store = configureStore({ reducer: { products: productsReducer } });
    await store.dispatch(fetchProducts());
    expect(store.getState().products.status).toBe('failed');
  });
});

// ──── INTEGRATION: TEST COMPONENT WITH STORE ────
function renderWithStore(ui: React.ReactElement, preloadedState = {}) {
  const store = configureStore({
    reducer: { cart: cartSlice },
    preloadedState,
  });
  return render(<Provider store={store}>{ui}</Provider>);
}

it('renders cart items from store', () => {
  renderWithStore(<CartPage />, {
    cart: { items: [{ id: '1', name: 'Widget', price: 29.99, qty: 1 }], total: 29.99 },
  });
  expect(screen.getByText('Widget')).toBeInTheDocument();
  expect(screen.getByText('$29.99')).toBeInTheDocument();
});
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Reducers are pure functions: I test them with state + action → expected state. Selectors get tested with sample state shapes. Async thunks: I use configureStore in tests to dispatch and verify final state. For integrated component tests, I use a renderWithStore helper."*

## 4. 🧠 MEMORY AID
**"Reducer test: oldState + action = newState. Selector test: state → derived value. Thunk test: configureStore → dispatch → check state. Component: renderWithStore(ui, preloadedState)."**

## 5. 🎯 KEY INSIGHT
Testing Redux logic in isolation (reducer + selector) is fast and reliable. Save integration testing for verifying the component correctly reads from and dispatches to the store.
