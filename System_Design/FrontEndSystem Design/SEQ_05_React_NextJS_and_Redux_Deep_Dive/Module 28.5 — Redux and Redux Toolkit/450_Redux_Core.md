# 450 – Redux Core — Store, Actions, Reducers, Middleware

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Redux** = predictable state container. **Store** holds single state tree. **Actions** describe what happened (`{ type, payload }`). **Reducers** are pure functions: `(state, action) => newState`. **Middleware** intercepts dispatches for side effects (logging, async). Unidirectional: `dispatch(action) → middleware → reducer → new state → UI`.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── CORE CONCEPTS ────
import { createStore, combineReducers, applyMiddleware } from 'redux';

// 1. Actions
interface AddTodoAction { type: 'todos/add'; payload: { id: string; text: string } }
interface ToggleTodoAction { type: 'todos/toggle'; payload: string }
type TodoAction = AddTodoAction | ToggleTodoAction;

// Action creators
const addTodo = (text: string): AddTodoAction => ({
  type: 'todos/add',
  payload: { id: crypto.randomUUID(), text },
});
const toggleTodo = (id: string): ToggleTodoAction => ({
  type: 'todos/toggle',
  payload: id,
});

// 2. Reducer — pure function, immutable updates
interface Todo { id: string; text: string; done: boolean }

function todosReducer(state: Todo[] = [], action: TodoAction): Todo[] {
  switch (action.type) {
    case 'todos/add':
      return [...state, { ...action.payload, done: false }];
    case 'todos/toggle':
      return state.map(t =>
        t.id === action.payload ? { ...t, done: !t.done } : t
      );
    default:
      return state;
  }
}

function filterReducer(state = 'all', action: { type: string; payload?: string }) {
  if (action.type === 'filter/set') return action.payload!;
  return state;
}

// 3. Combine reducers
const rootReducer = combineReducers({
  todos: todosReducer,
  filter: filterReducer,
});

// 4. Middleware — intercepts dispatch
const loggerMiddleware = (store: any) => (next: any) => (action: any) => {
  console.log('Dispatching:', action.type);
  const result = next(action); // pass to next middleware/reducer
  console.log('New state:', store.getState());
  return result;
};

// 5. Create store
const store = createStore(
  rootReducer,
  applyMiddleware(loggerMiddleware),
);

// ──── REACT INTEGRATION ────
import { Provider, useSelector, useDispatch } from 'react-redux';

// Wrap app
function App() {
  return (
    <Provider store={store}>
      <TodoApp />
    </Provider>
  );
}

// Use in components
function TodoApp() {
  const todos = useSelector((state: RootState) => state.todos);
  const filter = useSelector((state: RootState) => state.filter);
  const dispatch = useDispatch();
  
  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.done;
    if (filter === 'completed') return t.done;
    return true;
  });
  
  return (
    <div>
      <button onClick={() => dispatch(addTodo('New task'))}>Add</button>
      {filteredTodos.map(t => (
        <div key={t.id} onClick={() => dispatch(toggleTodo(t.id))}>
          {t.done ? '✓' : '○'} {t.text}
        </div>
      ))}
    </div>
  );
}

type RootState = ReturnType<typeof rootReducer>;
```

### Redux Data Flow
```
User Click → dispatch(action) → Middleware → Reducer → New State → useSelector → UI Update
```

### Three Principles
| Principle | Meaning |
|---|---|
| Single source of truth | One store, one state tree |
| State is read-only | Only change via dispatch(action) |
| Pure reducers | `(state, action) => newState`, no side effects |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Redux: single store, actions describe events, reducers are pure (state, action) => newState. Middleware intercepts dispatch for side effects. Unidirectional flow: dispatch → middleware → reducer → state → UI. combineReducers splits state slices. React: Provider + useSelector + useDispatch."*

## 4. 🧠 MEMORY AID
**"Redux = Store (single tree) + Action ({type, payload}) + Reducer (pure fn) + Middleware (side effects). dispatch → middleware → reducer → state → UI."**
