# 258 – Incremental Refactoring

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Incremental Refactoring during machine coding rounds means improving code structure **as you go** without breaking existing functionality. Instead of writing messy code and doing a big refactor at the end (which you'll never have time for), you refactor in small steps: extract a component when it gets too large, lift state when a new feature needs it, replace inline logic with a hook. The key principle: **each refactor step should leave the code working**. This demonstrates engineering maturity — the ability to evolve code architecture under time pressure.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### When to Refactor During an Interview

Refactor when:
1. A component exceeds ~80 lines → extract sub-components
2. Two components share logic → extract a custom hook
3. A new feature needs state from a sibling → lift state up
4. You see repeated patterns → create a helper function
5. Your render function has more than 2 levels of conditional logic → extract

### Safe Refactoring Moves

**1. Extract Component:**
```typescript
// Before: one big component
function Dashboard() {
  // 30 lines of chart logic
  // 20 lines of table logic
  // 15 lines of filter logic
  return <div>...</div>;
}

// After: focused, testable components
function Dashboard() {
  const [filter, setFilter] = useState<Filter>(defaultFilter);
  return (
    <div>
      <FilterBar value={filter} onChange={setFilter} />
      <Chart data={filteredData} />
      <DataTable data={filteredData} />
    </div>
  );
}
```

**2. Extract Custom Hook:**
```typescript
// Before: fetch logic duplicated across components
function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/user').then(/* ... */); }, []);
  // ...
}

// After: reusable hook
function useAsync<T>(asyncFn: () => Promise<T>, deps: any[]) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });
  useEffect(() => {
    setState({ status: 'loading' });
    asyncFn()
      .then(data => setState({ status: 'success', data }))
      .catch(error => setState({ status: 'error', error: error.message }));
  }, deps);
  return state;
}
```

**3. Lift State Up:**
```typescript
// Before: SearchBar and ResultsList both need searchQuery
// SearchBar manages its own state, can't share with ResultsList

// After: lift to parent
function SearchPage() {
  const [query, setQuery] = useState('');
  return (
    <>
      <SearchBar value={query} onChange={setQuery} />
      <ResultsList query={query} />
    </>
  );
}
```

### Interview Anti-Patterns

- ❌ "I'll refactor at the end" — you won't have time
- ❌ Big-bang refactor — risky, break everything at once
- ❌ Refactoring without testing the result — breaks code invisibly
- ❌ Over-refactoring — extracting a 5-line component into a separate file

### Narrate Your Refactoring

Tell the interviewer: *"I'm going to extract this into a hook because the filter logic is now needed in two places."* This shows intentional design, not accidental complexity.

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, we practiced continuous refactoring in our Agile sprints. During feature development, we'd extract shared OData query patterns into custom hooks, lift shared state to parent containers, and extract UI patterns into shared Fiori components — all incrementally, never in a separate "refactoring sprint."

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I refactor incrementally during coding, not at the end. When a component exceeds 60-80 lines, I extract sub-components. When logic is needed in two places, I extract a custom hook. When a sibling needs state, I lift it up. Each refactor is small and leaves the code working. I narrate my refactoring decisions to the interviewer — 'I'm extracting this because...' — which demonstrates intentional architecture evolution."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Incremental refactoring during a Todo app build

// Iteration 1: Single component (MVP)
function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const add = () => { setTodos([...todos, { id: Date.now().toString(), text: input, done: false }]); setInput(''); };
  return (
    <div>
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={add}>Add</button>
      {todos.map(t => <div key={t.id}>{t.text}</div>)}
    </div>
  );
}

// Iteration 2: Extract — now I need filter, component is growing
function TodoApp() {
  const [todos, setTodos] = useTodos(); // extracted hook
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const filtered = useMemo(() => todos.filter(t => filter === 'all' ? true : filter === 'done' ? t.done : !t.done), [todos, filter]);
  return (
    <div>
      <AddTodoForm onAdd={text => setTodos(prev => [...prev, newTodo(text)])} />
      <FilterBar filter={filter} onChange={setFilter} />
      <TodoList items={filtered} onToggle={id => setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))} />
    </div>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Refactor as you go: Extract at 80 lines, Hook for shared logic, Lift for shared state."** Never refactor at the end — you won't have time. Each refactor must keep code working. Narrate your decisions: "I'm extracting this because..." Three moves: extract component, extract hook, lift state.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Shows you can evolve architecture under time pressure — a critical production skill.
**How:** Three safe moves (extract component, extract hook, lift state). Refactor when component > 80 lines, when logic is duplicated, or when state needs sharing. Narrate decisions.
**Companies:** All companies observe how you manage code architecture during live coding. It's a strong senior engineer signal.
