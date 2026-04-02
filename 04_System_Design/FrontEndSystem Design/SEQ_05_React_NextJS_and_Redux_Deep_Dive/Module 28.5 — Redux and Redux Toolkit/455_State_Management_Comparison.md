# 455 – Zustand vs Redux vs Jotai vs Recoil

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Modern React state management options: **Redux/RTK** (flux, enterprise). **Zustand** (minimal, hooks-first). **Jotai** (atomic, bottom-up). **Recoil** (atomic, Facebook). Each has distinct mental models: **Flux** (single store, actions), **Atomic** (atoms, derived selectors), **Proxy** (Valtio, MobX — mutable-feeling).

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── ZUSTAND — minimal, hooks-based ────
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

interface TodoStore {
  todos: Todo[];
  add: (text: string) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
}

const useTodoStore = create<TodoStore>()(
  devtools(
    persist(
      (set) => ({
        todos: [],
        add: (text) => set((state) => ({
          todos: [...state.todos, { id: crypto.randomUUID(), text, done: false }],
        })),
        toggle: (id) => set((state) => ({
          todos: state.todos.map(t => t.id === id ? { ...t, done: !t.done } : t),
        })),
        remove: (id) => set((state) => ({
          todos: state.todos.filter(t => t.id !== id),
        })),
      }),
      { name: 'todo-storage' }, // localStorage key
    ),
  ),
);

// Usage — no Provider needed!
function TodoList() {
  const todos = useTodoStore(state => state.todos);
  const add = useTodoStore(state => state.add);
  return (
    <div>
      <button onClick={() => add('New')}>Add</button>
      {todos.map(t => <TodoItem key={t.id} todo={t} />)}
    </div>
  );
}

// ──── JOTAI — atomic state ────
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';

// Atoms — primitive state units
const todosAtom = atom<Todo[]>([]);
const filterAtom = atom<'all' | 'active' | 'completed'>('all');

// Derived atom (read-only)
const filteredTodosAtom = atom((get) => {
  const todos = get(todosAtom);
  const filter = get(filterAtom);
  if (filter === 'active') return todos.filter(t => !t.done);
  if (filter === 'completed') return todos.filter(t => t.done);
  return todos;
});

// Write atom (action)
const addTodoAtom = atom(null, (get, set, text: string) => {
  set(todosAtom, [
    ...get(todosAtom),
    { id: crypto.randomUUID(), text, done: false },
  ]);
});

function TodoList() {
  const filtered = useAtomValue(filteredTodosAtom);
  const addTodo = useSetAtom(addTodoAtom);
  return <button onClick={() => addTodo('New')}>Add</button>;
}

// ──── RECOIL — atomic with selectors ────
import { atom as recoilAtom, selector, useRecoilState, useRecoilValue, RecoilRoot } from 'recoil';

const todosState = recoilAtom<Todo[]>({ key: 'todos', default: [] });
const filterState = recoilAtom({ key: 'filter', default: 'all' });

const filteredTodos = selector({
  key: 'filteredTodos',
  get: ({ get }) => {
    const todos = get(todosState);
    const filter = get(filterState);
    if (filter === 'active') return todos.filter(t => !t.done);
    return todos;
  },
});

// Requires <RecoilRoot>
function App() {
  return <RecoilRoot><TodoApp /></RecoilRoot>;
}

// ──── VALTIO — proxy-based (bonus) ────
import { proxy, useSnapshot } from 'valtio';

const state = proxy({ todos: [] as Todo[], filter: 'all' });

// Mutate directly!
state.todos.push({ id: '1', text: 'Task', done: false });

function TodoList() {
  const snap = useSnapshot(state); // reactive read
  return <ul>{snap.todos.map(t => <li>{t.text}</li>)}</ul>;
}
```

### Decision Matrix
| Criteria | Redux/RTK | Zustand | Jotai | Recoil |
|---|---|---|---|---|
| Bundle size | ~12KB | ~1KB | ~3KB | ~22KB |
| Boilerplate | Medium | Low | Low | Medium |
| DevTools | Excellent | Via middleware | Via devtools | Custom |
| Provider needed | Yes | No | Optional | Yes |
| Learning curve | Medium | Low | Low | Medium |
| Best for | Enterprise, complex | Small-medium apps | Atomic state | Facebook-scale |
| Mental model | Flux | Hooks store | Atoms | Atoms + selectors |
| Middleware | Rich ecosystem | Built-in | Extensions | Limited |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Redux for enterprise with rich middleware. Zustand for minimal ~1KB hooks store (no Provider). Jotai for atomic bottom-up state. Recoil for atom+selector Facebook model. Choose based on: app complexity (Redux), simplicity (Zustand), granularity (Jotai), team familiarity."*

## 4. 🧠 MEMORY AID
**"Redux = enterprise flux. Zustand = tiny hooks store. Jotai = atoms (bottom-up). Recoil = atoms+selectors (Facebook). Valtio = proxy magic."**
