# 453 – Selectors — createSelector and Reselect

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Selectors** extract and compute derived data from the Redux store. **createSelector** (Reselect) creates **memoized selectors** — recomputes only when inputs change. Prevents expensive recalculations on every render. Composable: selectors can use other selectors as inputs.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
import { createSelector } from '@reduxjs/toolkit'; // reselect included

// ──── BASIC SELECTORS (input selectors) ────
const selectTodos = (state: RootState) => state.todos.items;
const selectFilter = (state: RootState) => state.todos.filter;

// ──── MEMOIZED SELECTOR ────
const selectFilteredTodos = createSelector(
  [selectTodos, selectFilter], // input selectors
  (todos, filter) => {         // result function — only runs when inputs change
    switch (filter) {
      case 'active': return todos.filter(t => !t.done);
      case 'completed': return todos.filter(t => t.done);
      default: return todos;
    }
  },
);

// Usage
function TodoList() {
  const filtered = useAppSelector(selectFilteredTodos);
  // If neither todos nor filter changed, returns cached result
  // No re-computation, no new array reference
  return <ul>{filtered.map(t => <li key={t.id}>{t.text}</li>)}</ul>;
}

// ──── COMPOSING SELECTORS ────
const selectTodoCount = createSelector(
  [selectFilteredTodos], // uses another memoized selector
  (filtered) => filtered.length,
);

const selectTodoStats = createSelector(
  [selectTodos],
  (todos) => ({
    total: todos.length,
    active: todos.filter(t => !t.done).length,
    completed: todos.filter(t => t.done).length,
  }),
);

// ──── PARAMETERIZED SELECTORS ────
// Selector with argument — use factory pattern
const makeSelectTodoById = () =>
  createSelector(
    [selectTodos, (_state: RootState, id: string) => id],
    (todos, id) => todos.find(t => t.id === id),
  );

// Each component gets its own memoized instance
function TodoItem({ id }: { id: string }) {
  const selectTodoById = useMemo(makeSelectTodoById, []);
  const todo = useAppSelector(state => selectTodoById(state, id));
  return <div>{todo?.text}</div>;
}

// ──── STRUCTURED SELECTORS ────
// Select multiple fields into an object
import { createStructuredSelector } from 'reselect';

const selectTodoView = createStructuredSelector({
  todos: selectFilteredTodos,
  count: selectTodoCount,
  filter: selectFilter,
});

function TodoView() {
  const { todos, count, filter } = useAppSelector(selectTodoView);
  return <div>{count} {filter} todos</div>;
}

// ──── PERFORMANCE: WHY SELECTORS MATTER ────
// BAD: creates new array every render — triggers re-render
function BadComponent() {
  const activeTodos = useAppSelector(state =>
    state.todos.items.filter(t => !t.done), // new array every time!
  );
}

// GOOD: memoized — same reference if inputs unchanged
function GoodComponent() {
  const activeTodos = useAppSelector(selectFilteredTodos);
  // Same reference → React.memo works → no unnecessary re-renders
}

// ──── ENTITY ADAPTER SELECTORS ────
import { createEntityAdapter } from '@reduxjs/toolkit';

const todosAdapter = createEntityAdapter<Todo>();
const initialState = todosAdapter.getInitialState();

// Built-in selectors
const {
  selectAll,       // all entities as array
  selectById,      // entity by ID
  selectIds,       // all IDs
  selectEntities,  // normalized map
  selectTotal,     // count
} = todosAdapter.getSelectors((state: RootState) => state.todos);
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"createSelector memoizes derived data — result function only runs when input selectors return new values. Prevents expensive recomputation and maintains referential equality for React.memo. Composable: selectors use other selectors. Factory pattern (makeSelectX) for parameterized selectors to avoid cache conflicts."*

## 4. 🧠 MEMORY AID
**"createSelector([inputs], resultFn) — memoized. Same inputs → cached result → same reference. Compose selectors. Factory for params."**
