# 451 – Redux Toolkit (RTK) — createSlice, configureStore

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Redux Toolkit** = official, opinionated way to write Redux. `createSlice` generates actions + reducer. `configureStore` sets up store with good defaults (devtools, thunk middleware). Uses **Immer** under the hood — write "mutating" code that produces immutable updates. **90% less boilerplate** than vanilla Redux.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
import { createSlice, configureStore, PayloadAction } from '@reduxjs/toolkit';

// ──── createSlice — actions + reducer in one ────
interface Todo { id: string; text: string; done: boolean }
interface TodosState { items: Todo[]; filter: 'all' | 'active' | 'completed' }

const todosSlice = createSlice({
  name: 'todos',
  initialState: { items: [], filter: 'all' } as TodosState,
  reducers: {
    // Immer: "mutate" safely — produces immutable update
    add(state, action: PayloadAction<string>) {
      state.items.push({ // looks like mutation, but Immer handles it!
        id: crypto.randomUUID(),
        text: action.payload,
        done: false,
      });
    },
    toggle(state, action: PayloadAction<string>) {
      const todo = state.items.find(t => t.id === action.payload);
      if (todo) todo.done = !todo.done; // safe "mutation"
    },
    remove(state, action: PayloadAction<string>) {
      state.items = state.items.filter(t => t.id !== action.payload);
    },
    setFilter(state, action: PayloadAction<TodosState['filter']>) {
      state.filter = action.payload;
    },
  },
});

// Auto-generated action creators
export const { add, toggle, remove, setFilter } = todosSlice.actions;
// add('Buy milk') → { type: 'todos/add', payload: 'Buy milk' }

// ──── createSlice with prepare callback ────
const postsSlice = createSlice({
  name: 'posts',
  initialState: [] as Post[],
  reducers: {
    addPost: {
      reducer(state, action: PayloadAction<Post>) {
        state.push(action.payload);
      },
      prepare(title: string, body: string) {
        return {
          payload: {
            id: crypto.randomUUID(),
            title,
            body,
            createdAt: new Date().toISOString(),
          },
        };
      },
    },
  },
});

// ──── configureStore — store with good defaults ────
const store = configureStore({
  reducer: {
    todos: todosSlice.reducer,
    posts: postsSlice.reducer,
  },
  // Built-in: redux-thunk, devtools, serializability check
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(customMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Type exports
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// ──── Typed hooks ────
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// ──── Usage in component ────
function TodoList() {
  const { items, filter } = useAppSelector(state => state.todos);
  const dispatch = useAppDispatch();
  
  const filtered = items.filter(t => {
    if (filter === 'active') return !t.done;
    if (filter === 'completed') return t.done;
    return true;
  });
  
  return (
    <ul>
      {filtered.map(t => (
        <li key={t.id} onClick={() => dispatch(toggle(t.id))}>
          {t.done ? '✓' : '○'} {t.text}
          <button onClick={() => dispatch(remove(t.id))}>×</button>
        </li>
      ))}
    </ul>
  );
}
```

### RTK vs Vanilla Redux
| Feature | Vanilla Redux | Redux Toolkit |
|---|---|---|
| Action types | Manual strings | Auto-generated |
| Action creators | Manual functions | Auto-generated |
| Immutability | Spread manually | Immer (write mutations) |
| Store setup | createStore + boilerplate | configureStore |
| DevTools | Manual setup | Built-in |
| Thunk | Manual middleware | Built-in |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"RTK: createSlice generates actions + reducer with Immer (safe mutations). configureStore includes thunk, devtools, serializability checks. Typed hooks: useAppSelector/useAppDispatch. 90% less boilerplate than vanilla Redux. prepare callbacks for action payload transformation."*

## 4. 🧠 MEMORY AID
**"RTK = createSlice (actions + reducer + Immer) + configureStore (thunk + devtools). 'Mutation' code → Immer → immutable. Auto action creators."**
